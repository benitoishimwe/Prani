'use strict';

const prisma = require('../config/prisma');
const { AppError } = require('../middleware/errorHandler');

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_PLANS = ['free', 'trial', 'pro', 'max', 'enterprise', 'wedding', 'starter'];

// Static pricing + display metadata per plan
const PLAN_METADATA = {
  free:       { price: 0,    yearlyPrice: 0,    period: '',           desc: 'Perfect for exploring Plani.',                  cta: 'Get started free',   popular: false, oneTime: false },
  trial:      { price: 0,    yearlyPrice: 0,    period: '',           desc: 'Full access to all Pro features for 14 days.',  cta: 'Start free trial',   popular: false, oneTime: false },
  pro:        { price: 29,   yearlyPrice: 24,   period: '/month',     desc: 'For growing event planning businesses.',        cta: 'Start 14-day trial', popular: true,  oneTime: false },
  max:        { price: 79,   yearlyPrice: 66,   period: '/month',     desc: 'For large agencies and enterprise clients.',    cta: 'Start 14-day trial', popular: false, oneTime: false },
  wedding:    { price: 49,   yearlyPrice: 49,   period: 'one-time',   desc: 'One-time payment for one unforgettable day.',   cta: 'Plan my wedding',    popular: false, oneTime: true  },
  enterprise: { price: null, yearlyPrice: null, period: 'custom',     desc: 'Custom pricing for large organisations.',       cta: 'Contact sales',      popular: false, oneTime: false },
};

// Feature human-readable labels for the pricing UI
const FEATURE_LABELS = {
  ai_assistant:       'AI planning assistant',
  save_the_date:      'Save the Date cards',
  save_the_date_image:'Save-the-Date image generation',
  vendor_marketplace: 'Vendor marketplace',
  analytics:          'Advanced analytics',
  unlimited_events:   'Unlimited events',
  advanced_reports:   'Advanced reports & PDF export',
  white_label:        'White-label branding',
  api_access:         'API access',
};

const TRIAL_DAYS = 14;

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function _findActiveSubscription(userId) {
  return prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ['active', 'trial'] },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ─── Service methods ──────────────────────────────────────────────────────────

async function createFreeSubscription(userId, tenantId) {
  return prisma.subscription.create({
    data: {
      userId,
      tenantId: tenantId || null,
      plan: 'free',
      status: 'active',
    },
  });
}

async function getActiveSubscription(userId) {
  return _findActiveSubscription(userId);
}

async function getCurrentPlan(userId) {
  const subscription = await _findActiveSubscription(userId);
  return subscription ? subscription.plan : 'free';
}

/**
 * Start a 14-day trial for the user on the given plan.
 * Cancels any existing active/trial subscription first.
 */
async function startTrial(userId, plan, tenantId) {
  if (!['pro', 'max'].includes(plan)) {
    throw new AppError('Trials are only available for Pro and Max plans', 400, 'INVALID_TRIAL_PLAN');
  }

  // Check if user already had a trial
  const existingTrial = await prisma.subscription.findFirst({
    where: { userId, status: 'trial' },
  });
  if (existingTrial) {
    throw new AppError('You have already used your free trial', 409, 'TRIAL_ALREADY_USED');
  }

  // Expire any current active subscription
  await prisma.subscription.updateMany({
    where: { userId, status: { in: ['active', 'trial'] } },
    data: { status: 'expired' },
  });

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

  return prisma.subscription.create({
    data: {
      userId,
      tenantId: tenantId || null,
      plan,
      status: 'trial',
      trialEndsAt,
    },
  });
}

async function isFeatureEnabled(userId, featureKey) {
  const plan = await getCurrentPlan(userId);
  const feature = await prisma.subscriptionFeature.findFirst({
    where: { plan, featureKey },
  });
  return feature ? feature.isEnabled : false;
}

async function getFeatureLimit(userId, featureKey) {
  const plan = await getCurrentPlan(userId);
  const feature = await prisma.subscriptionFeature.findFirst({
    where: { plan, featureKey },
  });
  return feature ? feature.limitValue : null;
}

async function getSubscriptionDetails(userId) {
  const subscription = await _findActiveSubscription(userId);

  // tenants.subscriptionTier is the authoritative plan — fall back to subscription.plan
  let plan = subscription?.plan || 'free';
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { userId },
      select: { tenantId: true },
    });
    if (user?.tenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { tenantId: user.tenantId },
        select: { subscriptionTier: true },
      });
      if (tenant?.subscriptionTier) plan = tenant.subscriptionTier;
    }
  }

  const featureRows = await prisma.subscriptionFeature.findMany({ where: { plan } });
  const features = featureRows.reduce((acc, row) => {
    acc[row.featureKey] = row.isEnabled;
    return acc;
  }, {});

  let trialDaysLeft = null;
  if (subscription?.status === 'trial' && subscription.trialEndsAt) {
    const diff = new Date(subscription.trialEndsAt) - new Date();
    trialDaysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  return { subscription, features, plan, trialDaysLeft };
}

async function activateSubscription({
  userId,
  plan,
  stripeSubscriptionId,
  stripeCustomerId,
  periodStart,
  periodEnd,
  tenantId,
}) {
  if (!VALID_PLANS.includes(plan)) {
    throw new AppError(`Invalid plan: ${plan}`, 400, 'INVALID_PLAN');
  }

  const existing = await prisma.subscription.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  const data = {
    plan,
    status: 'active',
    stripeSubscriptionId: stripeSubscriptionId || null,
    stripeCustomerId: stripeCustomerId || null,
    currentPeriodStart: periodStart || null,
    currentPeriodEnd: periodEnd || null,
    cancelAtPeriodEnd: false,
    tenantId: tenantId || null,
  };

  if (existing) {
    return prisma.subscription.update({
      where: { subscriptionId: existing.subscriptionId },
      data,
    });
  }

  return prisma.subscription.create({
    data: { userId, ...data },
  });
}

async function cancelSubscription(userId) {
  const subscription = await _findActiveSubscription(userId);
  if (!subscription) {
    throw new AppError('No active subscription found', 404, 'SUBSCRIPTION_NOT_FOUND');
  }

  if (subscription.plan === 'free') {
    throw new AppError('Free plan cannot be cancelled', 400, 'CANNOT_CANCEL_FREE');
  }

  return prisma.subscription.update({
    where: { subscriptionId: subscription.subscriptionId },
    data: { cancelAtPeriodEnd: true },
  });
}

async function resumeSubscription(userId) {
  const subscription = await prisma.subscription.findFirst({
    where: { userId, cancelAtPeriodEnd: true, status: { in: ['active', 'trial'] } },
    orderBy: { createdAt: 'desc' },
  });

  if (!subscription) {
    throw new AppError('No subscription scheduled for cancellation', 404, 'NOT_CANCELLING');
  }

  return prisma.subscription.update({
    where: { subscriptionId: subscription.subscriptionId },
    data: { cancelAtPeriodEnd: false },
  });
}

async function getPlansWithFeatures() {
  const allFeatures = await prisma.subscriptionFeature.findMany({
    orderBy: [{ plan: 'asc' }, { featureKey: 'asc' }],
  });

  // Return an array of plans that the public pricing UI can consume directly
  const displayPlans = ['free', 'pro', 'max', 'wedding'];
  return displayPlans.map((planKey) => {
    const meta = PLAN_METADATA[planKey] || {};
    const dbFeatures = allFeatures.filter((f) => f.plan === planKey);
    const featureMap = Object.fromEntries(dbFeatures.map((f) => [f.featureKey, f.isEnabled]));

    // Build readable feature list: enabled features only
    const featureList = Object.entries(FEATURE_LABELS)
      .filter(([key]) => featureMap[key] === true)
      .map(([, label]) => label);

    return {
      key: planKey,
      name: planKey.charAt(0).toUpperCase() + planKey.slice(1),
      price: meta.price,
      yearlyPrice: meta.yearlyPrice,
      period: meta.period,
      desc: meta.desc,
      cta: meta.cta,
      popular: meta.popular,
      oneTime: meta.oneTime,
      features: featureList,
      featureMap,
    };
  });
}

/**
 * Cron: downgrade trials that have expired.
 * Called daily by the scheduler.
 */
async function downgradeExpiredTrials() {
  const now = new Date();
  const expired = await prisma.subscription.findMany({
    where: { status: 'trial', trialEndsAt: { lt: now } },
  });

  for (const sub of expired) {
    await prisma.subscription.update({
      where: { subscriptionId: sub.subscriptionId },
      data: { status: 'expired', plan: 'free' },
    });
  }

  return { downgraded: expired.length };
}

async function handleStripeWebhook({ event }) {
  const { type, data } = event;
  const obj = data.object;

  switch (type) {
    case 'checkout.session.completed': {
      const customerId    = obj.customer;
      const subscriptionId = obj.subscription;
      const metadata      = obj.metadata || {};
      const userId        = metadata.userId;
      const plan          = metadata.plan || 'pro';

      if (userId) {
        await activateSubscription({
          userId,
          plan,
          stripeSubscriptionId: subscriptionId,
          stripeCustomerId: customerId,
        });
      }
      break;
    }

    case 'invoice.payment_failed': {
      const stripeSubscriptionId = obj.subscription;
      if (stripeSubscriptionId) {
        const subscription = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId },
        });
        if (subscription) {
          await prisma.subscription.update({
            where: { subscriptionId: subscription.subscriptionId },
            data: { status: 'past_due' },
          });
        }
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const stripeSubscriptionId = obj.id;
      const subscription = await prisma.subscription.findFirst({
        where: { stripeSubscriptionId },
      });
      if (subscription) {
        await prisma.subscription.update({
          where: { subscriptionId: subscription.subscriptionId },
          data: { status: 'cancelled', cancelAtPeriodEnd: false },
        });
      }
      break;
    }

    case 'customer.subscription.updated': {
      const stripeSubscriptionId = obj.id;
      const subscription = await prisma.subscription.findFirst({
        where: { stripeSubscriptionId },
      });
      if (subscription) {
        await prisma.subscription.update({
          where: { subscriptionId: subscription.subscriptionId },
          data: {
            cancelAtPeriodEnd: obj.cancel_at_period_end ?? false,
            currentPeriodEnd: obj.current_period_end
              ? new Date(obj.current_period_end * 1000)
              : null,
          },
        });
      }
      break;
    }

    default:
      return { handled: false, type };
  }

  return { handled: true, type };
}

module.exports = {
  createFreeSubscription,
  getActiveSubscription,
  getCurrentPlan,
  isFeatureEnabled,
  getFeatureLimit,
  getSubscriptionDetails,
  activateSubscription,
  cancelSubscription,
  resumeSubscription,
  startTrial,
  downgradeExpiredTrials,
  getPlansWithFeatures,
  handleStripeWebhook,
};
