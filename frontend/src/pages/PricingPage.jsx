import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, X, Sparkles, Zap, Building2, Heart, CreditCard, Smartphone } from 'lucide-react';
import { useSubscription } from '../contexts/SubscriptionContext';
import { subscriptionsAPI } from '../services/api';
import { toast } from 'sonner';

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    icon: Zap,
    monthlyPrice: 0,
    yearlyPrice: 0,
    desc: 'Perfect for exploring Plani with no commitment.',
    features: [
      { label: '1 active event', ok: true },
      { label: '3 team members', ok: true },
      { label: 'Basic inventory management', ok: true },
      { label: 'Guest photo album', ok: true },
      { label: 'Email support', ok: true },
      { label: 'AI planning assistant', ok: false },
      { label: 'Save the Date cards', ok: false },
      { label: 'Vendor marketplace', ok: false },
      { label: 'Advanced reports', ok: false },
      { label: 'Unlimited events', ok: false },
    ],
    cta: 'Get started free',
    popular: false,
    color: '#6B7280',
    stripePriceId: null,
    action: 'free',
  },
  {
    key: 'pro',
    name: 'Pro',
    icon: Sparkles,
    monthlyPrice: 29,
    yearlyPrice: 24,
    desc: 'For growing event planning businesses.',
    features: [
      { label: 'Unlimited events', ok: true },
      { label: '20 team members', ok: true },
      { label: 'AI planning assistant', ok: true },
      { label: 'Save the Date (20/mo)', ok: true },
      { label: 'Vendor marketplace access', ok: true },
      { label: 'Advanced reports & PDFs', ok: true },
      { label: 'Wedding planner module', ok: true },
      { label: 'Priority email support', ok: true },
      { label: 'White-label reports', ok: false },
      { label: 'API access', ok: false },
    ],
    cta: 'Start 14-day trial',
    popular: true,
    color: '#E67E22',
    stripePriceId: process.env.REACT_APP_STRIPE_PRICE_PRO_MONTHLY,
    action: 'trial',
  },
  {
    key: 'max',
    name: 'Max',
    icon: Building2,
    monthlyPrice: 79,
    yearlyPrice: 66,
    desc: 'For large agencies and enterprise clients.',
    features: [
      { label: 'Everything in Pro', ok: true },
      { label: 'Unlimited team members', ok: true },
      { label: 'White-label reports', ok: true },
      { label: 'API access', ok: true },
      { label: 'Subdomain support', ok: true },
      { label: 'Dedicated account manager', ok: true },
      { label: 'Custom integrations', ok: true },
      { label: 'SLA guarantee', ok: true },
      { label: 'GDPR data export', ok: true },
      { label: 'Custom onboarding', ok: true },
    ],
    cta: 'Start 14-day trial',
    popular: false,
    color: '#0F4C5C',
    stripePriceId: process.env.REACT_APP_STRIPE_PRICE_MAX_MONTHLY,
    action: 'trial',
  },
  {
    key: 'wedding',
    name: 'Wedding',
    icon: Heart,
    monthlyPrice: 49,
    yearlyPrice: 49,
    desc: 'One-time payment for one unforgettable day.',
    features: [
      { label: '1 wedding event', ok: true },
      { label: 'All Pro features', ok: true },
      { label: 'Full wedding planner', ok: true },
      { label: 'Unlimited guests', ok: true },
      { label: 'Valid until wedding + 30 days', ok: true },
      { label: 'No monthly recurring charge', ok: true },
      { label: 'Guest photo album + QR code', ok: true },
      { label: 'Save the Date cards', ok: true },
      { label: 'AI wedding planning assistant', ok: true },
      { label: 'PDF timeline & reports', ok: true },
    ],
    cta: 'Plan my wedding',
    popular: false,
    color: '#FF6B6B',
    stripePriceId: process.env.REACT_APP_STRIPE_PRICE_WEDDING,
    action: 'wedding',
    oneTime: true,
  },
];

const STATIC_FEATURE_MATRIX = [
  { label: 'Events',             featureKey: null,               free: '1',      pro: 'Unlimited', max: 'Unlimited', wedding: '1' },
  { label: 'Team members',       featureKey: null,               free: '3',      pro: '20',        max: 'Unlimited', wedding: '10' },
  { label: 'AI Assistant',       featureKey: 'ai_assistant',     free: false,    pro: true,        max: true,        wedding: true },
  { label: 'Save the Date',      featureKey: 'save_the_date',    free: false,    pro: '20/mo',     max: 'Unlimited', wedding: '10' },
  { label: 'Vendor marketplace', featureKey: 'vendor_marketplace',free: false,   pro: true,        max: true,        wedding: true },
  { label: 'Reports & PDFs',     featureKey: 'advanced_reports', free: 'Basic',  pro: 'Full',      max: 'White-label', wedding: 'Full' },
  { label: 'Wedding planner',    featureKey: null,               free: false,    pro: true,        max: true,        wedding: true },
  { label: 'API access',         featureKey: 'api_access',       free: false,    pro: false,       max: true,        wedding: false },
  { label: 'White-label branding',featureKey: 'white_label',     free: false,    pro: false,       max: true,        wedding: false },
];

function MatrixCell({ val }) {
  if (val === true)  return <CheckCircle size={18} className="text-[#2E7D32] mx-auto" />;
  if (val === false) return <X size={16} className="text-[#9CA3AF] mx-auto" />;
  return <span className="text-sm text-[#374151] font-medium">{val}</span>;
}

export default function PricingPage() {
  const navigate = useNavigate();
  const { subscription, currentPlan, isOnTrial, trialDaysLeft, refresh } = useSubscription();
  const [yearly,       setYearly]       = useState(false);
  const [loading,      setLoading]      = useState(null);
  const [showMatrix,   setShowMatrix]   = useState(true);
  const [gateway,      setGateway]      = useState('stripe');
  const [planFeatures, setPlanFeatures] = useState(null); // { free: {ai_assistant: bool, ...}, pro: {...}, ... }

  useEffect(() => {
    subscriptionsAPI.plans()
      .then(res => {
        const data = res.data?.data || res.data;
        if (Array.isArray(data)) {
          const map = {};
          data.forEach(p => { map[p.key] = p.featureMap || {}; });
          setPlanFeatures(map);
        }
      })
      .catch(() => {});
  }, []);

  const handlePlanAction = async (plan) => {
    if (loading) return;
    setLoading(plan.key);

    try {
      // ── Free: just navigate to dashboard ────────────────────────────────
      if (plan.action === 'free') {
        navigate('/dashboard');
        return;
      }

      // ── Trial: call POST /subscriptions/trial ────────────────────────────
      if (plan.action === 'trial') {
        await subscriptionsAPI.startTrial(plan.key);
        toast.success(`Your 14-day ${plan.name} trial has started!`);
        await refresh();
        navigate('/dashboard');
        return;
      }

      // ── Wedding: one-time checkout ────────────────────────────────────────
      if (plan.action === 'wedding') {
        const res = await subscriptionsAPI.weddingCheckout();
        if (res.data?.url) {
          window.location.href = res.data.url;
        } else if (res.data?.activated) {
          toast.success('Wedding plan activated!');
          await refresh();
          navigate('/dashboard');
        }
        return;
      }

      // ── Paid upgrade: Stripe checkout ────────────────────────────────────
      if (plan.stripePriceId) {
        const priceId = yearly && !plan.oneTime
          ? (plan.key === 'pro'
              ? process.env.REACT_APP_STRIPE_PRICE_PRO_YEARLY
              : process.env.REACT_APP_STRIPE_PRICE_MAX_YEARLY)
          : plan.stripePriceId;

        const res = await subscriptionsAPI.checkout({ priceId, plan: plan.key, gateway });
        const url = res.data?.url || res.data?.checkoutUrl;
        if (url) window.location.href = url;
      } else {
        // No Stripe key configured — use mock upgrade for dev
        await subscriptionsAPI.mockUpgrade(plan.key);
        toast.success(`Upgraded to ${plan.name} (dev mode)`);
        await refresh();
        navigate('/dashboard');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Something went wrong';
      toast.error(msg);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10 animate-fade-in">
        <div className="feature-pill mb-4 mx-auto w-fit">Simple pricing</div>
        <h1 className="text-4xl font-bold text-[#111827]" style={{fontFamily:'Poppins,sans-serif'}}>
          Plans that grow with your business
        </h1>
        <p className="text-[#6B7280] mt-3 max-w-lg mx-auto">
          Start free. Upgrade when you're ready. All plans include Stripe and Paystack payment support.
        </p>

        {/* Trial active notice */}
        {isOnTrial && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium">
            <Sparkles size={14} />
            {trialDaysLeft !== null ? `${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} left on your trial` : 'Trial active'}
            — upgrade now to keep access
          </div>
        )}

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <span className={`text-sm font-medium ${!yearly ? 'text-[#111827]' : 'text-[#6B7280]'}`}>Monthly</span>
          <button
            onClick={() => setYearly(!yearly)}
            className={`relative w-12 h-6 rounded-full transition-colors ${yearly ? 'bg-[#0F4C5C]' : 'bg-[#E5E7EB]'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${yearly ? 'translate-x-6' : ''}`} />
          </button>
          <span className={`text-sm font-medium ${yearly ? 'text-[#111827]' : 'text-[#6B7280]'}`}>Yearly</span>
          <span className="tag tag-teal text-xs">Save up to 17%</span>
        </div>

        {/* Gateway selector */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <span className="text-xs text-[#6B7280]">Pay with:</span>
          {[
            { id: 'stripe',   label: 'Card (Stripe)',            icon: CreditCard  },
            { id: 'paystack', label: 'Mobile Money (Paystack)',  icon: Smartphone  },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setGateway(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                gateway === id ? 'border-[#0F4C5C] bg-[#E8F4F8] text-[#0F4C5C]' : 'border-[#E5E7EB] text-[#6B7280]'
              }`}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10 animate-slide-up">
        {PLANS.map((plan) => {
          const price     = plan.oneTime ? plan.monthlyPrice : (yearly ? plan.yearlyPrice : plan.monthlyPrice);
          const isCurrent = currentPlan === plan.key;
          const isTrialPlan = isOnTrial && ['pro','max'].includes(plan.key) && plan.key === currentPlan;
          const PlanIcon  = plan.icon;

          // Determine label/disabled state
          let ctaLabel = plan.cta;
          let disabled  = isCurrent && !isOnTrial;

          if (isCurrent && isOnTrial) {
            ctaLabel = `Trial active (${trialDaysLeft ?? '?'}d left)`;
            disabled = false;
          } else if (isCurrent && !isOnTrial) {
            ctaLabel = 'Current plan';
          }

          return (
            <div key={plan.key} className={`plan-card ${plan.popular ? 'popular' : ''} flex flex-col`}>
              {plan.popular && <div className="tag tag-amber text-xs self-start mb-3">Most popular</div>}
              {isCurrent && !plan.popular && (
                <div className={`tag ${isOnTrial ? 'tag-amber' : 'tag-teal'} text-xs self-start mb-3`}>
                  {isOnTrial ? 'Trial active' : 'Current plan'}
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:`${plan.color}15`}}>
                  <PlanIcon size={20} style={{color: plan.color}} />
                </div>
                <h2 className="text-xl font-bold text-[#111827]" style={{fontFamily:'Poppins,sans-serif'}}>{plan.name}</h2>
              </div>

              <div className="mb-2 flex items-end gap-1">
                <span className="text-4xl font-bold text-[#111827]" style={{fontFamily:'Poppins,sans-serif'}}>
                  ${price}
                </span>
                {plan.oneTime
                  ? <span className="text-[#6B7280] text-sm pb-1">one-time</span>
                  : price > 0 && <span className="text-[#6B7280] text-sm pb-1">/month{yearly ? ' (billed yearly)' : ''}</span>
                }
              </div>
              <p className="text-sm text-[#6B7280] mb-5 leading-relaxed">{plan.desc}</p>

              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map(({ label, ok }) => (
                  <li key={label} className="flex items-start gap-2 text-sm">
                    {ok
                      ? <CheckCircle size={15} className="text-[#2E7D32] flex-shrink-0 mt-0.5" />
                      : <X size={15} className="text-[#9CA3AF] flex-shrink-0 mt-0.5" />
                    }
                    <span className={ok ? 'text-[#374151]' : 'text-[#9CA3AF]'}>{label}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => !disabled && handlePlanAction(plan)}
                disabled={disabled || loading === plan.key}
                className={`py-3 rounded-xl font-semibold text-sm transition-all ${
                  plan.popular
                    ? 'btn-amber py-3'
                    : disabled
                    ? 'bg-[#E8F4F8] text-[#0F4C5C] cursor-default'
                    : 'border-2 border-[#0F4C5C] text-[#0F4C5C] hover:bg-[#E8F4F8]'
                }`}
              >
                {loading === plan.key ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Processing...
                  </span>
                ) : ctaLabel}
              </button>
            </div>
          );
        })}
      </div>

      {/* Feature comparison matrix toggle */}
      <div className="text-center mb-6">
        <button
          onClick={() => setShowMatrix(!showMatrix)}
          className="text-sm font-medium text-[#0F4C5C] hover:underline flex items-center gap-1 mx-auto"
        >
          {showMatrix ? 'Hide' : 'Show'} full feature comparison
        </button>
      </div>

      {showMatrix && (
        <div className="card-plani overflow-hidden mb-10 animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F9F9FB]">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[#111827]">Feature</th>
                  {PLANS.map(p => (
                    <th key={p.key} className="px-4 py-4 text-center text-sm font-semibold text-[#111827]" style={{fontFamily:'Poppins,sans-serif'}}>
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {STATIC_FEATURE_MATRIX.map(({ label, featureKey, free, pro, max, wedding }, i) => {
                  // Override with live DB values if available
                  const resolve = (plan, staticVal) => {
                    if (!featureKey || !planFeatures?.[plan]) return staticVal;
                    const dbVal = planFeatures[plan][featureKey];
                    return dbVal !== undefined ? dbVal : staticVal;
                  };
                  return (
                    <tr key={label} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F9F9FB]'}>
                      <td className="px-6 py-3.5 text-sm text-[#374151] font-medium">{label}</td>
                      <td className="px-4 py-3.5 text-center"><MatrixCell val={resolve('free', free)} /></td>
                      <td className="px-4 py-3.5 text-center"><MatrixCell val={resolve('pro', pro)} /></td>
                      <td className="px-4 py-3.5 text-center"><MatrixCell val={resolve('max', max)} /></td>
                      <td className="px-4 py-3.5 text-center"><MatrixCell val={resolve('wedding', wedding)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment methods note */}
      <div className="card-plani p-6 text-center animate-fade-in">
        <h3 className="font-semibold text-[#111827] mb-2" style={{fontFamily:'Poppins,sans-serif'}}>Payment methods</h3>
        <p className="text-sm text-[#6B7280] max-w-lg mx-auto">
          Plani supports <strong>Stripe</strong> for credit/debit cards (Visa, Mastercard, Amex) and
          <strong> Paystack</strong> for mobile money (M-Pesa, Airtel Money, MTN MoMo) and local African bank cards.
          All payments are secure and encrypted.
        </p>
        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-[#9CA3AF]">
          <span className="flex items-center gap-1.5"><CreditCard size={14} />Visa / Mastercard</span>
          <span className="flex items-center gap-1.5"><Smartphone size={14} />M-Pesa</span>
          <span className="flex items-center gap-1.5"><Smartphone size={14} />Airtel Money</span>
          <span className="flex items-center gap-1.5"><Smartphone size={14} />MTN MoMo</span>
        </div>
      </div>
    </div>
  );
}
