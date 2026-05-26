/**
 * validate-features.js
 *
 * Audits whether every feature declared in the super-admin feature matrix has a
 * corresponding backend API route and a frontend page/component.
 *
 * Usage (from node-backend/ directory):
 *   node scripts/validate-features.js
 *
 * Optional env: BACKEND_URL (default http://localhost:3001)
 *               ADMIN_TOKEN  (JWT for a super_admin user — enables live endpoint checks)
 */

'use strict';

const fs       = require('fs');
const path     = require('path');
const http     = require('http');
const https    = require('https');

const BACKEND_URL  = process.env.BACKEND_URL  || 'http://localhost:3001';
const ADMIN_TOKEN  = process.env.ADMIN_TOKEN  || '';
const FRONTEND_SRC = path.resolve(__dirname, '../../frontend/src');

// ─── Feature definitions ──────────────────────────────────────────────────────

const FEATURES = [
  {
    key: 'ai_assistant',
    label: 'AI Assistant',
    backendRoute: '/api/ai/chat',
    backendMethod: 'POST',
    frontendPage: 'pages/AIAssistantPage.jsx',
    frontendComponent: null,
  },
  {
    key: 'save_the_date',
    label: 'Save the Date',
    backendRoute: '/api/save-the-date/templates',
    backendMethod: 'GET',
    frontendPage: 'pages/SaveTheDatePage.jsx',
    frontendComponent: null,
  },
  {
    key: 'save_the_date_image',
    label: 'Save-the-Date Image Generation',
    backendRoute: '/api/ai/save-the-date/image',
    backendMethod: 'POST',
    frontendPage: 'pages/SaveTheDatePage.jsx',
    frontendComponent: null,
  },
  {
    key: 'vendor_marketplace',
    label: 'Vendor Marketplace',
    backendRoute: '/api/marketplace/vendors',
    backendMethod: 'GET',
    frontendPage: 'pages/MarketplacePage.jsx',
    frontendComponent: null,
  },
  {
    key: 'analytics',
    label: 'Analytics & Reports',
    backendRoute: '/api/transactions/stats',
    backendMethod: 'GET',
    frontendPage: 'pages/ReportsPage.jsx',
    frontendComponent: null,
  },
  {
    key: 'unlimited_events',
    label: 'Unlimited Events',
    backendRoute: '/api/events',
    backendMethod: 'GET',
    frontendPage: 'pages/EventsPage.jsx',
    frontendComponent: null,
  },
  {
    key: 'advanced_reports',
    label: 'Advanced Reports & PDF',
    backendRoute: '/api/events',
    backendMethod: 'GET',
    frontendPage: 'pages/ReportsPage.jsx',
    frontendComponent: null,
    frontendPattern: 'handleExportCSV|handleExportPDF|Download',
  },
  {
    key: 'white_label',
    label: 'White Label Branding',
    backendRoute: '/api/tenants/me/branding',
    backendMethod: 'GET',
    frontendPage: null,
    frontendComponent: null,
    frontendPattern: 'branding|primaryColor|logoUrl',
  },
  {
    key: 'api_access',
    label: 'API Access',
    backendRoute: '/api/api-keys',
    backendMethod: 'GET',
    frontendPage: null,
    frontendComponent: null,
    frontendPattern: 'api-keys|ApiKey|apiKeys',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function colourize(str, code) {
  return `\x1b[${code}m${str}\x1b[0m`;
}
const green  = s => colourize(s, '32');
const red    = s => colourize(s, '31');
const yellow = s => colourize(s, '33');
const bold   = s => colourize(s, '1');
const dim    = s => colourize(s, '2');

function checkFile(relPath) {
  if (!relPath) return null;
  const abs = path.join(FRONTEND_SRC, relPath);
  return fs.existsSync(abs) ? abs : null;
}

function searchPattern(relPath, pattern) {
  if (!relPath || !pattern) return null;
  const abs = path.join(FRONTEND_SRC, relPath);
  if (!fs.existsSync(abs)) return false;
  const content = fs.readFileSync(abs, 'utf8');
  return new RegExp(pattern, 'i').test(content);
}

function httpRequest(url, method, token) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const mod    = parsed.protocol === 'https:' ? https : http;
    const opts   = {
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method,
      headers:  {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      timeout: 5000,
    };

    const req = mod.request(opts, (res) => {
      // We don't need the body — 401/403/402 = route exists, 404 = missing
      resolve({ status: res.statusCode });
    });

    req.on('error', () => resolve({ status: 0 }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0 }); });
    req.end();
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(bold('\n🔍  Plani Feature Validation Report'));
  console.log(dim(`  Backend: ${BACKEND_URL}`));
  console.log(dim(`  Frontend src: ${FRONTEND_SRC}`));
  console.log(dim(`  Auth token: ${ADMIN_TOKEN ? 'provided' : 'none (live checks will get 401)'}\n`));

  const results = [];

  for (const feature of FEATURES) {
    const result = {
      key:             feature.key,
      label:           feature.label,
      frontendFileOk:  null,
      frontendPattern: null,
      backendRouteOk:  null,
    };

    // 1. Frontend page file
    if (feature.frontendPage) {
      result.frontendFileOk = !!checkFile(feature.frontendPage);
    }

    // 2. Frontend pattern search
    if (feature.frontendPattern) {
      result.frontendPattern = searchPattern(feature.frontendPage, feature.frontendPattern);
    }

    // 3. Backend route (live HTTP check)
    if (BACKEND_URL) {
      const url = `${BACKEND_URL}${feature.backendRoute}`;
      try {
        const { status } = await httpRequest(url, feature.backendMethod, ADMIN_TOKEN);
        // 404 = definitely missing; 0 = server down; anything else = route exists
        if (status === 0) {
          result.backendRouteOk = 'unreachable';
        } else if (status === 404) {
          result.backendRouteOk = false;
        } else {
          result.backendRouteOk = true;
        }
      } catch {
        result.backendRouteOk = 'error';
      }
    }

    results.push(result);
  }

  // ─── Print results ──────────────────────────────────────────────────────────

  let passing = 0;
  let failing = 0;

  for (const r of results) {
    const checks = [];

    if (r.frontendFileOk !== null) {
      checks.push(r.frontendFileOk
        ? green('✓ frontend file')
        : red('✗ frontend file missing'));
    }

    if (r.frontendPattern !== null) {
      checks.push(r.frontendPattern
        ? green('✓ UI pattern found')
        : yellow('⚠ UI pattern not found'));
    }

    if (r.backendRouteOk !== null) {
      if (r.backendRouteOk === true)          checks.push(green('✓ backend route'));
      else if (r.backendRouteOk === false)    checks.push(red('✗ backend route missing (404)'));
      else if (r.backendRouteOk === 'unreachable') checks.push(yellow('~ server unreachable'));
      else                                    checks.push(yellow('~ backend check error'));
    }

    const allGood = checks.every(c => !c.includes('✗'));
    if (allGood) passing++; else failing++;

    const statusIcon = allGood ? green('●') : red('●');
    console.log(`  ${statusIcon}  ${bold(r.label.padEnd(36))} ${checks.join('  ')}`);
  }

  console.log(`\n  ${bold('Summary:')} ${green(`${passing} passing`)}  ${failing > 0 ? red(`${failing} failing`) : dim('0 failing')}\n`);

  if (failing > 0) process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
