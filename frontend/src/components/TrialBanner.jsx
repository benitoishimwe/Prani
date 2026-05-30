import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Clock, Zap } from 'lucide-react';
import { useSubscription } from '../contexts/SubscriptionContext';

export default function TrialBanner() {
  const navigate = useNavigate();
  const { isOnTrial, trialDaysLeft } = useSubscription();

  if (!isOnTrial) return null;

  const hasCountdown  = trialDaysLeft !== null && trialDaysLeft >= 0;
  const isExpiring    = hasCountdown && trialDaysLeft <= 3;
  const isLastDay     = hasCountdown && trialDaysLeft <= 1;

  const bg = isLastDay  ? 'bg-red-600'
           : isExpiring ? 'bg-red-500'
           : 'bg-amber-500';

  const message = hasCountdown
    ? isExpiring
      ? `⚠️ Your free trial expires in ${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''}! Upgrade to keep all features.`
      : `You're on a 14-day free trial — ${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} remaining.`
    : `You're on a 14-day free trial. Upgrade to unlock all features after it ends.`;

  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium ${bg} text-white`}>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {isExpiring
          ? <Clock size={15} className="shrink-0 animate-pulse" />
          : <Sparkles size={15} className="shrink-0" />
        }
        <span className="truncate">{message}</span>
        {hasCountdown && (
          <span className="shrink-0 hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-xs font-bold">
            <Zap size={11} />
            {trialDaysLeft}d left
          </span>
        )}
      </div>
      <button
        onClick={() => navigate('/pricing')}
        className="shrink-0 px-3 py-1 rounded-full bg-white/25 hover:bg-white/40 text-white text-xs font-semibold transition-colors whitespace-nowrap border border-white/30"
      >
        Upgrade now →
      </button>
    </div>
  );
}
