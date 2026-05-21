import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, X, Clock } from 'lucide-react';
import { useSubscription } from '../contexts/SubscriptionContext';

export default function TrialBanner() {
  const navigate = useNavigate();
  const { isOnTrial, trialDaysLeft, currentPlan } = useSubscription();

  if (!isOnTrial) return null;

  const isExpiringSoon = trialDaysLeft !== null && trialDaysLeft <= 3;

  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium ${
      isExpiringSoon
        ? 'bg-red-500 text-white'
        : 'bg-amber-500 text-white'
    }`}>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {isExpiringSoon
          ? <Clock size={15} className="shrink-0" />
          : <Sparkles size={15} className="shrink-0" />
        }
        <span className="truncate">
          {trialDaysLeft !== null
            ? isExpiringSoon
              ? `Your ${currentPlan} trial expires in ${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''}. Upgrade now to keep all features.`
              : `You're on a ${currentPlan} trial — ${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} remaining.`
            : `You're on a ${currentPlan} trial.`
          }
        </span>
      </div>
      <button
        onClick={() => navigate('/pricing')}
        className="shrink-0 px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition-colors whitespace-nowrap"
      >
        Upgrade now
      </button>
    </div>
  );
}
