'use strict';

const { Router } = require('express');
const chatbotService = require('../services/chatbot.service');
const supportService = require('../services/support.service');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { requireRole, Roles } = require('../middleware/rbac');
const R = require('../utils/response');

const router = Router();

// ── In-memory rate limiter: 10 requests / IP / hour for public chat ───────────
const _publicChatHits = new Map();
function publicChatRateLimit(req, res, next) {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const key = `chat:${ip}`;
  const now = Date.now();
  const WINDOW_MS = 60 * 60 * 1000; // 1 hour
  const MAX = 10;

  const entry = _publicChatHits.get(key);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    _publicChatHits.set(key, { count: 1, windowStart: now });
    return next();
  }
  if (entry.count >= MAX) {
    res.setHeader('Retry-After', Math.ceil((WINDOW_MS - (now - entry.windowStart)) / 1000));
    return res.status(429).json({ error: 'Too many requests. Please try again in an hour.' });
  }
  entry.count++;
  return next();
}

// Clean up stale entries every 2 hours to prevent memory growth
setInterval(() => {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [k, v] of _publicChatHits) {
    if (v.windowStart < cutoff) _publicChatHits.delete(k);
  }
}, 2 * 60 * 60 * 1000).unref();

// ── POST /public/support/chat — anonymous chatbot ─────────────────────────────
router.post('/public/support/chat', publicChatRateLimit, async (req, res, next) => {
  try {
    const { message, sessionToken } = req.body;
    if (!message?.trim()) return R.badRequest(res, 'message is required');

    const result = await chatbotService.chat({ message, sessionToken, systemPrompt: 'PUBLIC' });

    if (result.shouldEscalate) {
      const ticket = await supportService.createTicket({
        email: req.body.email || 'anonymous@support.request',
        subject: 'Escalated from chatbot',
        message: result.escalationSummary || message,
      });
      return R.ok(res, { ...result, escalatedTicketId: ticket.ticketId });
    }

    return R.ok(res, result);
  } catch (err) { next(err); }
});

// ── POST /public/support/ticket — anonymous ticket creation ───────────────────
router.post('/public/support/ticket', async (req, res, next) => {
  try {
    const { email, subject, message } = req.body;
    if (!email || !subject || !message) return R.badRequest(res, 'email, subject and message are required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return R.badRequest(res, 'Invalid email address');

    const ticket = await supportService.createTicket({ email, subject, message });
    return R.created(res, { ticketId: ticket.ticketId }, 'Support ticket created. We will respond to your email.');
  } catch (err) { next(err); }
});

// ── GET /support/chat/conversation — get user chat history (auth) ─────────────
router.get('/support/chat/conversation', authenticate, async (req, res, next) => {
  try {
    const result = await chatbotService.getConversationHistory({ userId: req.user.userId });
    return R.ok(res, result);
  } catch (err) { next(err); }
});

// ── POST /support/chat — authenticated chatbot ────────────────────────────────
router.post('/support/chat', authenticate, async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) return R.badRequest(res, 'message is required');

    const result = await chatbotService.chat({ message, userId: req.user.userId });

    if (result.shouldEscalate) {
      const ticket = await supportService.createTicket({
        userId: req.user.userId,
        email: req.user.email,
        subject: 'Escalated from chatbot',
        message: result.escalationSummary || message,
      });
      return R.ok(res, { ...result, escalatedTicketId: ticket.ticketId });
    }

    return R.ok(res, result);
  } catch (err) { next(err); }
});

// ── POST /support/ticket — authenticated ticket creation ──────────────────────
router.post('/support/ticket', authenticate, async (req, res, next) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) return R.badRequest(res, 'subject and message are required');

    const ticket = await supportService.createTicket({
      userId: req.user.userId,
      email: req.user.email,
      subject,
      message,
    });
    return R.created(res, { ticketId: ticket.ticketId }, 'Support ticket created successfully.');
  } catch (err) { next(err); }
});

// ── GET /support/tickets/mine — user's own tickets ────────────────────────────
router.get('/support/tickets/mine', authenticate, async (req, res, next) => {
  try {
    const tickets = await supportService.getUserTickets(req.user.userId);
    return R.ok(res, tickets);
  } catch (err) { next(err); }
});

// ── GET /support/tickets — admin: list all tickets ────────────────────────────
router.get('/support/tickets', authenticate,
  requireRole(Roles.TENANT_ADMIN, Roles.SUPER_ADMIN),
  async (req, res, next) => {
    try {
      const { status, priority, page, size } = req.query;
      const result = await supportService.listTickets({
        status: status || undefined,
        priority: priority || undefined,
        page: page ? parseInt(page, 10) : 1,
        size: size ? parseInt(size, 10) : 20,
      });
      return R.ok(res, result);
    } catch (err) { next(err); }
  }
);

// ── GET /support/tickets/:ticketId — admin: get single ticket ─────────────────
router.get('/support/tickets/:ticketId', authenticate,
  requireRole(Roles.TENANT_ADMIN, Roles.SUPER_ADMIN),
  async (req, res, next) => {
    try {
      const ticket = await supportService.getTicket(req.params.ticketId);
      return R.ok(res, ticket);
    } catch (err) {
      if (err.status === 404) return R.notFound(res, err.message);
      next(err);
    }
  }
);

// ── PATCH /support/tickets/:ticketId/status — admin: update ticket status ─────
router.patch('/support/tickets/:ticketId/status', authenticate,
  requireRole(Roles.TENANT_ADMIN, Roles.SUPER_ADMIN),
  async (req, res, next) => {
    try {
      const { status, resolution, assignedTo } = req.body;
      const ticket = await supportService.updateTicketStatus({
        ticketId: req.params.ticketId,
        status,
        resolution,
        assignedTo,
      });
      return R.ok(res, ticket);
    } catch (err) {
      if (err.status === 404) return R.notFound(res, err.message);
      next(err);
    }
  }
);

// ── POST /support/tickets/:ticketId/reply — add reply to ticket ───────────────
router.post('/support/tickets/:ticketId/reply', authenticate, async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) return R.badRequest(res, 'message is required');

    const isSupport = [Roles.TENANT_ADMIN, Roles.SUPER_ADMIN].includes(req.user.role);
    const msg = await supportService.replyToTicket({
      ticketId: req.params.ticketId,
      message,
      senderType: isSupport ? 'support' : 'user',
      replierEmail: req.user.email,
    });
    return R.created(res, msg);
  } catch (err) {
    if (err.status === 404) return R.notFound(res, err.message);
    if (err.status === 400) return R.badRequest(res, err.message);
    next(err);
  }
});

// ── GET /support/tickets/:ticketId/messages — get ticket messages ─────────────
router.get('/support/tickets/:ticketId/messages', authenticate, async (req, res, next) => {
  try {
    const ticket = await supportService.getTicket(req.params.ticketId);
    return R.ok(res, ticket.supportMessages);
  } catch (err) {
    if (err.status === 404) return R.notFound(res, err.message);
    next(err);
  }
});

module.exports = router;
