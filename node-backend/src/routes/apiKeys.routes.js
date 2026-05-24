'use strict';

/**
 * API Key management — stub implementation.
 * Requires the `api_keys` table (see migration: add_api_keys_table.sql).
 * Gated behind the `api_access` feature flag.
 */

const express = require('express');
const crypto  = require('crypto');
const { authenticate } = require('../middleware/auth');
const { requireFeature } = require('../middleware/featureGate');
const { requireRole, Roles } = require('../middleware/rbac');
const { ok, created, badRequest, notFound } = require('../utils/response');
const prisma = require('../config/prisma');

const router = express.Router();

const gate = [authenticate, requireFeature('api_access')];

// ─── GET /api/api-keys ────────────────────────────────────────────────────────
router.get('/', ...gate, async (req, res, next) => {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { tenantId: req.user.tenantId, revokedAt: null },
      select: { keyId: true, name: true, prefix: true, scopes: true, createdAt: true, lastUsedAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return ok(res, keys);
  } catch (err) { next(err); }
});

// ─── POST /api/api-keys ───────────────────────────────────────────────────────
router.post('/', ...gate, requireRole(Roles.TENANT_ADMIN), async (req, res, next) => {
  try {
    const { name, scopes = [] } = req.body;
    if (!name?.trim()) return badRequest(res, 'name is required');

    const rawKey  = `pk_${crypto.randomBytes(24).toString('hex')}`;
    const prefix  = rawKey.slice(0, 10);
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const key = await prisma.apiKey.create({
      data: {
        tenantId:  req.user.tenantId,
        createdBy: req.user.userId,
        name:      name.trim(),
        prefix,
        keyHash,
        scopes:    Array.isArray(scopes) ? scopes : [],
      },
    });

    // Return the raw key only once — it is never stored in plaintext
    return created(res, {
      keyId:     key.keyId,
      name:      key.name,
      prefix:    key.prefix,
      scopes:    key.scopes,
      createdAt: key.createdAt,
      key:       rawKey,
    }, 'API key created — copy it now, it will not be shown again');
  } catch (err) { next(err); }
});

// ─── DELETE /api/api-keys/:keyId ──────────────────────────────────────────────
router.delete('/:keyId', ...gate, requireRole(Roles.TENANT_ADMIN), async (req, res, next) => {
  try {
    const existing = await prisma.apiKey.findFirst({
      where: { keyId: req.params.keyId, tenantId: req.user.tenantId },
    });
    if (!existing) return notFound(res, 'API key not found');

    await prisma.apiKey.update({
      where: { keyId: req.params.keyId },
      data: { revokedAt: new Date() },
    });
    return ok(res, null, 'API key revoked');
  } catch (err) { next(err); }
});

module.exports = router;
