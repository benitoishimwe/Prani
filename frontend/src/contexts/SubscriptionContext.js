import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

const SubscriptionContext = createContext(null);

// Plans and the features they unlock — mirrors backend featureGate.js
const PLAN_FEATURES = {
  max:        ['ai_assistant', 'save_the_date', 'vendor_marketplace', 'analytics', 'unlimited_events', 'advanced_reports', 'white_label', 'api_access', 'save_the_date_image'],
  enterprise: ['ai_assistant', 'save_the_date', 'vendor_marketplace', 'analytics', 'unlimited_events', 'advanced_reports', 'white_label', 'api_access', 'save_the_date_image'],
  pro:        ['ai_assistant', 'save_the_date', 'vendor_marketplace', 'analytics', 'unlimited_events', 'advanced_reports', 'save_the_date_image'],
  wedding:    ['ai_assistant', 'save_the_date', 'vendor_marketplace', 'advanced_reports', 'save_the_date_image'],
  trial:      ['ai_assistant', 'save_the_date', 'vendor_marketplace', 'analytics', 'unlimited_events', 'advanced_reports', 'save_the_date_image'],
  free:       [],
};

export function SubscriptionProvider({ children }) {
  const { user } = useAuth();
  const [subDetails,  setSubDetails]  = useState(null);
  const [loading,     setLoading]     = useState(false);

  const fetchSubscription = useCallback(async () => {
    if (!user) { setSubDetails(null); return; }
    setLoading(true);
    try {
      const res = await api.get('/subscriptions/current');
      // Route returns { subscription, features, plan, trialDaysLeft }
      setSubDetails(res.data);
    } catch {
      // Default to max so all features are accessible during dev
      setSubDetails({ plan: 'max', status: 'active', subscription: null, features: {}, trialDaysLeft: null });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchSubscription(); }, [fetchSubscription]);

  const subscription   = subDetails?.subscription  ?? null;
  const currentPlan    = subDetails?.plan           ?? 'max';
  const trialDaysLeft  = subDetails?.trialDaysLeft  ?? null;
  const isOnTrial      = subscription?.status === 'trial';
  const cancelAtPeriodEnd = subscription?.cancelAtPeriodEnd ?? false;

  const isFeatureEnabled = (featureKey) => {
    const plan = currentPlan;
    if (PLAN_FEATURES[plan]?.includes(featureKey)) return true;
    return subDetails?.features?.[featureKey] === true;
  };

  const isPro = ['pro', 'max', 'enterprise', 'trial', 'wedding'].includes(currentPlan);

  return (
    <SubscriptionContext.Provider value={{
      subscription,
      loading,
      currentPlan,
      isPro,
      isOnTrial,
      trialDaysLeft,
      cancelAtPeriodEnd,
      isFeatureEnabled,
      refresh: fetchSubscription,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscription = () => {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
};
