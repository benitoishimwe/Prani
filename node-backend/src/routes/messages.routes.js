'use strict';

const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const R = require('../utils/response');
const svc = require('../services/messages.service');

const router = Router();

// ─── Team members list ────────────────────────────────────────────────────────
// GET /api/messages/team
router.get('/team', authenticate, async (req, res, next) => {
  try {
    const { tenantId, userId } = req.user;
    if (!tenantId) return R.badRequest(res, 'Tenant context required');
    const members = await svc.listTeamMembers({ tenantId, excludeUserId: userId });
    return R.ok(res, { members });
  } catch (err) { next(err); }
});

// ─── DM conversation previews ─────────────────────────────────────────────────
// GET /api/messages/conversations
router.get('/conversations', authenticate, async (req, res, next) => {
  try {
    const { tenantId, userId } = req.user;
    if (!tenantId) return R.badRequest(res, 'Tenant context required');
    const conversations = await svc.listConversationPreviews({ tenantId, userId });
    return R.ok(res, { conversations });
  } catch (err) { next(err); }
});

// ─── Single DM thread ─────────────────────────────────────────────────────────
// GET /api/messages/conversation/:partnerId
router.get('/conversation/:partnerId', authenticate, async (req, res, next) => {
  try {
    const { tenantId, userId } = req.user;
    if (!tenantId) return R.badRequest(res, 'Tenant context required');
    const { partnerId } = req.params;
    const { page, size } = req.query;
    const result = await svc.listConversation({
      tenantId, userId, partnerId,
      page: page ? parseInt(page, 10) : 1,
      size: size ? parseInt(size, 10) : 100,
    });
    return R.ok(res, result);
  } catch (err) { next(err); }
});

// ─── Send DM ─────────────────────────────────────────────────────────────────
// POST /api/messages/dm
router.post('/dm', authenticate, async (req, res, next) => {
  try {
    const { tenantId, userId } = req.user;
    if (!tenantId) return R.badRequest(res, 'Tenant context required');
    const { recipientId, content } = req.body;
    if (!content?.trim()) return R.badRequest(res, 'content is required');
    if (!recipientId) return R.badRequest(res, 'recipientId is required');
    const message = await svc.sendDM({
      tenantId,
      senderId: userId,
      senderName: req.user.name || req.user.email,
      senderRole: req.user.role,
      recipientId,
      content,
    });
    return R.created(res, message, 'Message sent');
  } catch (err) { next(err); }
});

// ─── Mark DM thread as read ───────────────────────────────────────────────────
// PATCH /api/messages/conversation/:partnerId/read
router.patch('/conversation/:partnerId/read', authenticate, async (req, res, next) => {
  try {
    const { tenantId, userId } = req.user;
    if (!tenantId) return R.badRequest(res, 'Tenant context required');
    await svc.markConversationRead({ tenantId, userId, partnerId: req.params.partnerId });
    return R.ok(res, null, 'Marked as read');
  } catch (err) { next(err); }
});

// ─── Unread DM count ─────────────────────────────────────────────────────────
// GET /api/messages/unread-count
router.get('/unread-count', authenticate, async (req, res, next) => {
  try {
    const { tenantId, userId } = req.user;
    if (!tenantId) return R.ok(res, { count: 0 });
    const count = await svc.getUnreadDMCount({ tenantId, userId });
    return R.ok(res, { count });
  } catch (err) { next(err); }
});

// ─── Client broadcast channel (admin "Clients" tab) ──────────────────────────
// GET /api/messages/clients
router.get('/clients', authenticate, async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    if (!tenantId) return R.badRequest(res, 'Tenant context required');
    const { page, size } = req.query;
    const result = await svc.listClientMessages({
      tenantId,
      page: page ? parseInt(page, 10) : 1,
      size: size ? parseInt(size, 10) : 200,
    });
    return R.ok(res, result);
  } catch (err) { next(err); }
});

// POST /api/messages/clients
router.post('/clients', authenticate, async (req, res, next) => {
  try {
    const { tenantId, userId } = req.user;
    if (!tenantId) return R.badRequest(res, 'Tenant context required');
    const { content } = req.body;
    if (!content?.trim()) return R.badRequest(res, 'content is required');
    const message = await svc.sendClientBroadcast({
      tenantId,
      senderId: userId,
      senderName: req.user.name || req.user.email,
      senderRole: req.user.role,
      content,
    });
    return R.created(res, message, 'Message sent');
  } catch (err) { next(err); }
});

// PATCH /api/messages/clients/read
router.patch('/clients/read', authenticate, async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    if (!tenantId) return R.badRequest(res, 'Tenant context required');
    await svc.markClientMessagesRead({ tenantId, readerRole: req.user.role });
    return R.ok(res, null, 'Marked as read');
  } catch (err) { next(err); }
});

module.exports = router;
