'use strict';

const { Router } = require('express');
const guestCheckinService = require('../services/guestCheckin.service');
const { authenticate } = require('../middleware/auth');
const { requireRole, Roles } = require('../middleware/rbac');
const { generateQrCodeBase64 } = require('../utils/qrcode');
const R = require('../utils/response');
const config = require('../config/env');

const router = Router();

// ── GET /events/:eventId/guest-qr — get QR code data URI (admin only) ─────────
router.get('/events/:eventId/guest-qr', authenticate,
  requireRole(Roles.TENANT_ADMIN, Roles.EVENT_MANAGER, Roles.SUPER_ADMIN),
  async (req, res, next) => {
    try {
      const { eventId } = req.params;
      const tenantId = req.user.tenantId;
      const event = await guestCheckinService.getQrData({ eventId, tenantId });
      const checkinUrl = `${config.frontendUrl}/guest/checkin/${eventId}`;
      const qrDataUrl = await generateQrCodeBase64(checkinUrl, { width: 400 });
      return R.ok(res, { qrDataUrl, checkinUrl, eventName: event.name, guestCheckinEnabled: event.guestCheckinEnabled });
    } catch (err) { next(err); }
  }
);

// ── PATCH /events/:eventId/guest-checkin-toggle — enable/disable (admin only) ─
router.patch('/events/:eventId/guest-checkin-toggle', authenticate,
  requireRole(Roles.TENANT_ADMIN, Roles.EVENT_MANAGER, Roles.SUPER_ADMIN),
  async (req, res, next) => {
    try {
      const { eventId } = req.params;
      const { enabled } = req.body;
      if (typeof enabled !== 'boolean') return R.badRequest(res, '"enabled" must be a boolean');
      const result = await guestCheckinService.toggleCheckin({ eventId, tenantId: req.user.tenantId, enabled });
      return R.ok(res, result);
    } catch (err) { next(err); }
  }
);

// ── GET /events/:eventId/guest-checkins — list checked-in guests (admin only) ─
router.get('/events/:eventId/guest-checkins', authenticate,
  requireRole(Roles.TENANT_ADMIN, Roles.EVENT_MANAGER, Roles.SUPER_ADMIN),
  async (req, res, next) => {
    try {
      const checkins = await guestCheckinService.getCheckins({
        eventId: req.params.eventId,
        tenantId: req.user.tenantId,
      });
      return R.ok(res, checkins);
    } catch (err) { next(err); }
  }
);

// ── POST /public/guest/checkin/request-otp — guest requests OTP (public) ──────
router.post('/public/guest/checkin/request-otp', async (req, res, next) => {
  try {
    const { eventId, email, guestName } = req.body;
    if (!eventId || !email) return R.badRequest(res, 'eventId and email are required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return R.badRequest(res, 'Invalid email address');
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await guestCheckinService.requestOtp({ eventId, email, guestName, ipAddress });
    return R.ok(res, result, 'OTP sent to your email');
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// ── POST /public/guest/checkin/verify-otp — guest verifies OTP (public) ───────
router.post('/public/guest/checkin/verify-otp', async (req, res, next) => {
  try {
    const { attemptId, otpCode } = req.body;
    if (!attemptId || !otpCode) return R.badRequest(res, 'attemptId and otpCode are required');
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await guestCheckinService.verifyOtp({ attemptId, otpCode, ipAddress });
    return R.ok(res, result, 'Check-in verified successfully');
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

module.exports = router;
