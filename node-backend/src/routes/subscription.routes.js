'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { ok, created, badRequest, serverError } = require('../utils/response');
const subscriptionService = require('../services/subscription.service');
const config = require('../config/env');

const router = express.Router();

// ─── GET /api/subscriptions/plans ────────────────────────────────────────────
router.get('/plans', async (req, res, next) => {
  try {
    const plans = await subscriptionService.getPlansWithFeatures();
    return ok(res, plans);
  } catch (err) {
    return next(err);
  }
});

// ─── GET /api/subscriptions/current (alias for /me) ──────────────────────────
router.get('/current', authenticate, async (req, res, next) => {
  try {
    let details = await subscriptionService.getSubscriptionDetails(req.user.userId);

    // Auto-start a 14-day Max trial for any standalone user (no tenant) on the free plan.
    // Covers clients, vendors, and any other self-registered roles.
    // Fires once per user — startTrial throws 409 if already used.
    const isStandalone = !req.user.tenantId;
    if (isStandalone && details.plan === 'free') {
      try {
        await subscriptionService.startTrial(req.user.userId, 'max', null);
        details = await subscriptionService.getSubscriptionDetails(req.user.userId);
      } catch (_) {
        // Trial already used, or not eligible — keep existing plan.
      }
    }

    return ok(res, details);
  } catch (err) {
    return next(err);
  }
});

// ─── GET /api/subscriptions/me ────────────────────────────────────────────────
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const subscription = await subscriptionService.getActiveSubscription(req.user.userId);
    return ok(res, subscription);
  } catch (err) {
    return next(err);
  }
});

// ─── GET /api/subscriptions/me/details ───────────────────────────────────────
router.get('/me/details', authenticate, async (req, res, next) => {
  try {
    const details = await subscriptionService.getSubscriptionDetails(req.user.userId);
    return ok(res, details);
  } catch (err) {
    return next(err);
  }
});

// ─── POST /api/subscriptions/trial ───────────────────────────────────────────
// Start a 14-day free trial for Pro or Max.
router.post('/trial', authenticate, async (req, res, next) => {
  try {
    const { plan } = req.body;
    if (!plan) return badRequest(res, 'plan is required');

    const subscription = await subscriptionService.startTrial(
      req.user.userId,
      plan,
      req.user.tenantId,
    );
    return created(res, subscription, `14-day ${plan} trial started`);
  } catch (err) {
    return next(err);
  }
});

// ─── POST /api/subscriptions/checkout ────────────────────────────────────────
router.post('/checkout', authenticate, async (req, res, next) => {
  try {
    const { priceId, plan, yearly } = req.body;

    if (!priceId || !plan) return badRequest(res, 'priceId and plan are required');

    if (!config.stripe?.secretKey) {
      return serverError(res, 'Stripe is not configured on this server');
    }

    const stripe = require('stripe')(config.stripe.secretKey);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        userId: req.user.userId,
        tenantId: req.user.tenantId || '',
        plan,
      },
      success_url: `${config.frontendUrl}/dashboard?checkout=success&plan=${plan}`,
      cancel_url: `${config.frontendUrl}/pricing?checkout=cancelled`,
    });

    return ok(res, { url: session.url, sessionId: session.id });
  } catch (err) {
    return next(err);
  }
});

// ─── POST /api/subscriptions/wedding-checkout ────────────────────────────────
// One-time payment for the Wedding plan.
router.post('/wedding-checkout', authenticate, async (req, res, next) => {
  try {
    const priceId = config.stripe?.priceWedding || process.env.STRIPE_PRICE_WEDDING;

    if (!config.stripe?.secretKey || !priceId) {
      // Mock mode: activate wedding plan directly
      const sub = await subscriptionService.activateSubscription({
        userId: req.user.userId,
        plan: 'wedding',
        tenantId: req.user.tenantId,
      });
      return ok(res, { activated: true, subscription: sub });
    }

    const stripe = require('stripe')(config.stripe.secretKey);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        userId: req.user.userId,
        tenantId: req.user.tenantId || '',
        plan: 'wedding',
      },
      success_url: `${config.frontendUrl}/dashboard?checkout=success&plan=wedding`,
      cancel_url: `${config.frontendUrl}/pricing?checkout=cancelled`,
    });

    return ok(res, { url: session.url, sessionId: session.id });
  } catch (err) {
    return next(err);
  }
});

// ─── POST /api/subscriptions/cancel ──────────────────────────────────────────
router.post('/cancel', authenticate, async (req, res, next) => {
  try {
    const subscription = await subscriptionService.cancelSubscription(req.user.userId);
    return ok(res, subscription, 'Subscription will be cancelled at the end of the current billing period');
  } catch (err) {
    return next(err);
  }
});

// ─── POST /api/subscriptions/resume ──────────────────────────────────────────
router.post('/resume', authenticate, async (req, res, next) => {
  try {
    const subscription = await subscriptionService.resumeSubscription(req.user.userId);
    return ok(res, subscription, 'Subscription cancellation reversed');
  } catch (err) {
    return next(err);
  }
});

// ─── POST /api/subscriptions/mock-upgrade ────────────────────────────────────
// Dev-only: activate any plan without Stripe.
router.post('/mock-upgrade', authenticate, async (req, res, next) => {
  try {
    const { plan } = req.body;
    if (!plan) return badRequest(res, 'plan is required');

    const subscription = await subscriptionService.activateSubscription({
      userId:   req.user.userId,
      plan,
      tenantId: req.user.tenantId,
    });
    return ok(res, subscription, `Upgraded to ${plan} (mock)`);
  } catch (err) {
    return next(err);
  }
});

// ─── GET /api/subscriptions/invoices ─────────────────────────────────────────
router.get('/invoices', authenticate, async (req, res, next) => {
  try {
    if (!config.stripe?.secretKey) {
      return ok(res, []);
    }

    const subscription = await subscriptionService.getActiveSubscription(req.user.userId);

    if (!subscription?.stripeCustomerId) {
      return ok(res, []);
    }

    const stripe = require('stripe')(config.stripe.secretKey);
    const invoices = await stripe.invoices.list({
      customer: subscription.stripeCustomerId,
      limit: 12,
    });

    const formatted = invoices.data.map(inv => ({
      id:          inv.id,
      number:      inv.number,
      amount:      inv.amount_paid / 100,
      currency:    inv.currency.toUpperCase(),
      status:      inv.status,
      date:        new Date(inv.created * 1000).toISOString(),
      pdfUrl:      inv.invoice_pdf,
      hostedUrl:   inv.hosted_invoice_url,
    }));

    return ok(res, formatted);
  } catch (err) {
    return next(err);
  }
});

// ─── POST /api/subscriptions/portal ──────────────────────────────────────────
router.post('/portal', authenticate, async (req, res, next) => {
  try {
    if (!config.stripe?.secretKey) {
      return serverError(res, 'Stripe is not configured on this server');
    }

    const stripe       = require('stripe')(config.stripe.secretKey);
    const subscription = await subscriptionService.getActiveSubscription(req.user.userId);

    if (!subscription?.stripeCustomerId) {
      return badRequest(res, 'No Stripe customer found. Please subscribe to a plan first.');
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer:   subscription.stripeCustomerId,
      return_url: `${config.frontendUrl}/billing`,
    });

    return ok(res, { url: portalSession.url });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
