'use strict';

const { PrismaClient } = require('@prisma/client');
const config = require('./env');

// Strip null bytes (0x00) from any string value, recursively through objects/arrays.
// PostgreSQL text columns reject 0x00 with error code 22021.
// We use charCodeAt to avoid any source-encoding issues with regex/split patterns.
function deepClean(value) {
  if (typeof value === 'string') {
    let out = '';
    for (let i = 0; i < value.length; i++) {
      if (value.charCodeAt(i) !== 0) out += value[i];
    }
    return out;
  }
  if (Array.isArray(value)) return value.map(deepClean);
  if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
    const out = {};
    for (const k of Object.keys(value)) out[k] = deepClean(value[k]);
    return out;
  }
  return value;
}

function makeClient(opts) {
  const base = new PrismaClient(opts);
  // Prisma 5+: use $extends for query-level hooks (replaces deprecated $use).
  // Strip null bytes from all write operations before they reach PostgreSQL.
  return base.$extends({
    query: {
      $allModels: {
        async create({ args, query }) {
          if (args.data) args.data = deepClean(args.data);
          return query(args);
        },
        async update({ args, query }) {
          if (args.data) args.data = deepClean(args.data);
          return query(args);
        },
        async upsert({ args, query }) {
          if (args.create) args.create = deepClean(args.create);
          if (args.update) args.update = deepClean(args.update);
          return query(args);
        },
        async createMany({ args, query }) {
          if (args.data) args.data = deepClean(args.data);
          return query(args);
        },
        async updateMany({ args, query }) {
          if (args.data) args.data = deepClean(args.data);
          return query(args);
        },
      },
    },
  });
}

/**
 * Prisma client singleton.
 * In development we attach the instance to globalThis to survive hot-reload
 * without exhausting the connection pool. In production we always create one
 * instance at module load time and reuse it.
 */

let prisma;

if (config.isDevelopment) {
  // Use a versioned key so changing prisma.js always forces a fresh client
  // (e.g. when middleware is added).  The key is bumped intentionally here.
  const CACHE_KEY = '__prismaClientV3';
  if (!globalThis[CACHE_KEY]) {
    globalThis[CACHE_KEY] = makeClient({ log: ['query', 'info', 'warn', 'error'] });
  }
  prisma = globalThis[CACHE_KEY];
} else {
  prisma = makeClient({ log: ['warn', 'error'] });
}

/**
 * Gracefully disconnect Prisma when the process exits.
 * Called from src/index.js during shutdown, but registering here ensures
 * it also fires if the client is imported without the server entry point.
 */
async function disconnectPrisma() {
  await prisma.$disconnect();
}

process.on('beforeExit', async () => {
  await disconnectPrisma();
});

module.exports = prisma;
module.exports.disconnectPrisma = disconnectPrisma;
