'use strict';

const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const prisma = require('../config/prisma');
const R = require('../utils/response');

const router = Router();

// ─── GET / — list notifications for current user ─────────────────────────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { userId } = req.user;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;
    return R.ok(res, { notifications, unreadCount });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /read-all — mark all notifications as read ────────────────────────
// NOTE: declared before /:notificationId to avoid "read-all" being treated as an id
router.patch('/read-all', authenticate, async (req, res, next) => {
  try {
    const { userId } = req.user;
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return R.ok(res, null, 'All notifications marked as read');
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /clear-all — delete all read notifications ───────────────────────
router.delete('/clear-all', authenticate, async (req, res, next) => {
  try {
    const { userId } = req.user;
    await prisma.notification.deleteMany({
      where: { userId, isRead: true },
    });
    return R.ok(res, null, 'Read notifications cleared');
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /:notificationId — delete single notification ────────────────────
router.delete('/:notificationId', authenticate, async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const { userId } = req.user;
    const notification = await prisma.notification.findFirst({ where: { notificationId, userId } });
    if (!notification) return R.notFound(res, 'Notification not found');
    await prisma.notification.delete({ where: { notificationId } });
    return R.ok(res, null, 'Notification deleted');
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /:notificationId/read — mark single notification as read ───────────
router.patch('/:notificationId/read', authenticate, async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const { userId } = req.user;

    const notification = await prisma.notification.findFirst({
      where: { notificationId, userId },
    });
    if (!notification) return R.notFound(res, 'Notification not found');

    const updated = await prisma.notification.update({
      where: { notificationId },
      data: { isRead: true },
    });
    return R.ok(res, updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
