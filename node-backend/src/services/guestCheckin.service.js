'use strict';

const prisma = require('../config/prisma');
const emailService = require('./email.service');

const MAX_FAILED_ATTEMPTS = 3;
const LOCK_MINUTES = 15;

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function requestOtp({ eventId, email, guestName, ipAddress }) {
  const event = await prisma.event.findUnique({
    where: { eventId },
    select: { eventId: true, name: true, guestCheckinEnabled: true, guestCheckinOtpExpiryMinutes: true },
  });

  if (!event) throw Object.assign(new Error('Event not found'), { status: 404 });
  if (!event.guestCheckinEnabled) throw Object.assign(new Error('Guest check-in is not enabled for this event'), { status: 403 });

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await prisma.guestCheckinAttempt.findUnique({
    where: { eventId_email: { eventId, email: normalizedEmail } },
  });

  if (existing?.status === 'verified') {
    throw Object.assign(new Error('You are already checked in for this event'), { status: 409 });
  }

  if (existing?.lockedUntil && existing.lockedUntil > new Date()) {
    const mins = Math.ceil((existing.lockedUntil - new Date()) / 60000);
    throw Object.assign(new Error(`Too many failed attempts. Please try again in ${mins} minute(s)`), { status: 429 });
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + event.guestCheckinOtpExpiryMinutes * 60 * 1000);

  const attempt = await prisma.guestCheckinAttempt.upsert({
    where: { eventId_email: { eventId, email: normalizedEmail } },
    create: {
      eventId,
      email: normalizedEmail,
      guestName: guestName || null,
      otpCode: otp,
      otpExpiresAt: expiresAt,
      status: 'pending',
      failedAttempts: 0,
    },
    update: {
      guestName: guestName || undefined,
      otpCode: otp,
      otpExpiresAt: expiresAt,
      status: 'pending',
      failedAttempts: 0,
      lockedUntil: null,
    },
  });

  await emailService.sendGuestCheckinOtp(normalizedEmail, otp, event.name, event.guestCheckinOtpExpiryMinutes);

  return { attemptId: attempt.attemptId, expiresAt };
}

async function verifyOtp({ attemptId, otpCode, ipAddress }) {
  const attempt = await prisma.guestCheckinAttempt.findUnique({ where: { attemptId } });

  if (!attempt) throw Object.assign(new Error('Check-in attempt not found'), { status: 404 });
  if (attempt.status === 'verified') throw Object.assign(new Error('Already verified'), { status: 409 });

  if (attempt.lockedUntil && attempt.lockedUntil > new Date()) {
    const mins = Math.ceil((attempt.lockedUntil - new Date()) / 60000);
    throw Object.assign(new Error(`Account locked. Try again in ${mins} minute(s)`), { status: 429 });
  }

  if (!attempt.otpCode || !attempt.otpExpiresAt || attempt.otpExpiresAt < new Date()) {
    await prisma.guestCheckinAttempt.update({
      where: { attemptId },
      data: { status: 'expired' },
    });
    throw Object.assign(new Error('OTP has expired. Please request a new one'), { status: 400 });
  }

  if (attempt.otpCode !== String(otpCode).trim()) {
    const newFailCount = attempt.failedAttempts + 1;
    const shouldLock = newFailCount >= MAX_FAILED_ATTEMPTS;
    await prisma.guestCheckinAttempt.update({
      where: { attemptId },
      data: {
        failedAttempts: newFailCount,
        lockedUntil: shouldLock ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000) : null,
      },
    });
    const remaining = MAX_FAILED_ATTEMPTS - newFailCount;
    if (shouldLock) throw Object.assign(new Error(`Too many failed attempts. Account locked for ${LOCK_MINUTES} minutes`), { status: 429 });
    throw Object.assign(new Error(`Invalid OTP code. ${remaining} attempt(s) remaining`), { status: 400 });
  }

  const now = new Date();
  await prisma.guestCheckinAttempt.update({
    where: { attemptId },
    data: { status: 'verified', verifiedAt: now, otpCode: null },
  });

  await prisma.guestCheckin.create({
    data: {
      eventId: attempt.eventId,
      email: attempt.email,
      guestName: attempt.guestName,
      ipAddress: ipAddress || null,
    },
  });

  const event = await prisma.event.findUnique({
    where: { eventId: attempt.eventId },
    select: { name: true },
  });

  return { email: attempt.email, guestName: attempt.guestName, eventName: event?.name, checkedInAt: now };
}

function eventAccessCondition(tenantId, createdBy) {
  if (tenantId) return `tenant_id = '${tenantId}'`;
  if (createdBy) return `(tenant_id IS NULL OR created_by = '${createdBy}')`;
  return 'tenant_id IS NULL';
}

async function getCheckins({ eventId, tenantId, createdBy }) {
  const condition = eventAccessCondition(tenantId, createdBy);
  const events = await prisma.$queryRawUnsafe(
    `SELECT event_id FROM events WHERE event_id = $1 AND (${condition})`,
    eventId
  );
  if (!events[0]) throw Object.assign(new Error('Event not found'), { status: 404 });

  return prisma.guestCheckin.findMany({
    where: { eventId },
    orderBy: { checkedInAt: 'desc' },
  });
}

async function getQrData({ eventId, tenantId, createdBy }) {
  const condition = eventAccessCondition(tenantId, createdBy);
  const rows = await prisma.$queryRawUnsafe(
    `SELECT event_id AS "eventId", name,
            COALESCE(guest_checkin_enabled, false) AS "guestCheckinEnabled"
     FROM events WHERE event_id = $1 AND (${condition})`,
    eventId
  );
  if (!rows[0]) throw Object.assign(new Error('Event not found'), { status: 404 });
  return rows[0];
}

async function toggleCheckin({ eventId, tenantId, createdBy, enabled }) {
  const condition = eventAccessCondition(tenantId, createdBy);
  const events = await prisma.$queryRawUnsafe(
    `SELECT event_id FROM events WHERE event_id = $1 AND (${condition})`,
    eventId
  );
  if (!events[0]) throw Object.assign(new Error('Event not found'), { status: 404 });

  await prisma.$queryRawUnsafe(
    `UPDATE events SET guest_checkin_enabled = $1 WHERE event_id = $2`,
    enabled,
    eventId
  );
  return { eventId, guestCheckinEnabled: enabled };
}

async function expireStaleAttempts() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const { count } = await prisma.guestCheckinAttempt.updateMany({
    where: { status: 'pending', otpExpiresAt: { lt: new Date() }, createdAt: { lt: cutoff } },
    data: { status: 'expired' },
  });
  return count;
}

module.exports = { requestOtp, verifyOtp, getCheckins, getQrData, toggleCheckin, expireStaleAttempts };
