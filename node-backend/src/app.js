'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const config = require('./config/env');
const { errorHandler } = require('./middleware/errorHandler');
const { notFound } = require('./utils/response');

const app = express();

// ── Security headers ────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: config.isProduction ? undefined : false,
  })
);

// ── CORS ────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (config.corsOrigins.includes(origin) || config.corsOrigins.includes('*')) {
        return callback(null, true);
      }
      // Allow all Vercel preview deployments for this project
      if (origin && origin.match(/^https:\/\/plani(-[a-z0-9]+)*\.vercel\.app$/)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: origin "${origin}" is not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Token', 'X-Tenant-ID'],
  })
);

// ── Request logging ─────────────────────────────────────────────────────────
if (config.isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ── Raw body for Stripe webhooks (must come BEFORE json body parser) ─────────
app.use(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' })
);

// ── JSON body parser ─────────────────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ── Strip null bytes (0x00) from all string fields in request bodies ─────────
// PostgreSQL text columns reject null bytes with error code 22021.
function stripNullBytes(value) {
  if (typeof value === 'string') return value.split(String.fromCharCode(0)).join('');
  if (Array.isArray(value))     return value.map(stripNullBytes);
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) out[k] = stripNullBytes(value[k]);
    return out;
  }
  return value;
}
app.use((req, _res, next) => {
  if (req.body) req.body = stripNullBytes(req.body);
  next();
});

// ── Static files ─────────────────────────────────────────────────────────────
const publicDir = path.resolve(config.publicDir);
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
app.use('/public', express.static(publicDir));

// ── Health / root endpoints ───────────────────────────────────────────────────
// GET /  and  GET /api/  → simple liveness response
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'Plani API' });
});

app.get('/api', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'Plani API' });
});

// Legacy /health kept for backwards-compat; the canonical route is /api/health
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    version: require('../package.json').version,
  });
});

// ── API Routes ───────────────────────────────────────────────────────────────
// All routes are registered via the central index router which mounts each
// module at its correct plural path (e.g. /api/events, /api/transactions).
app.use('/api', require('./routes/index'));

// ── 404 handler (must come after all routes) ─────────────────────────────────
app.use((req, res) => {
  notFound(res, `Cannot ${req.method} ${req.originalUrl}`);
});

// ── Global error handler (must be last middleware, 4 args) ───────────────────
app.use(errorHandler);

module.exports = app;
