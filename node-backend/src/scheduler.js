'use strict';

const subscriptionService = require('./services/subscription.service');

const HOUR_MS  = 60 * 60 * 1000;
const DAY_MS   = 24 * HOUR_MS;

/**
 * Run all daily subscription maintenance tasks.
 * Safe to call multiple times; each task is independent.
 */
async function runDailyMaintenance() {
  try {
    const { downgraded } = await subscriptionService.downgradeExpiredTrials();
    if (downgraded > 0) {
      console.log(`[scheduler] Downgraded ${downgraded} expired trial(s) to free`);
    }
  } catch (err) {
    console.error('[scheduler] Error during daily maintenance:', err.message);
  }
}

/**
 * Start background maintenance intervals.
 * Call once from index.js after the server starts.
 */
function startScheduler() {
  // Run once on startup (after a 5-second delay so DB connections are ready)
  setTimeout(runDailyMaintenance, 5_000);

  // Then run every 12 hours
  setInterval(runDailyMaintenance, 12 * HOUR_MS);

  console.log('[scheduler] Background maintenance scheduler started (12h interval)');
}

module.exports = { startScheduler, runDailyMaintenance };
