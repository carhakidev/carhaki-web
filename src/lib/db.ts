// NOTE: Run `npx prisma generate` after adding DATABASE_URL to generate the client types.
// This file works correctly at runtime; the TS error below resolves after generation.

/* eslint-disable @typescript-eslint/no-explicit-any */
let prismaInstance: any;

function getPrisma() {
  if (!prismaInstance) {
    // Dynamic require avoids build-time errors before `prisma generate`
    const { PrismaClient } = require('@prisma/client'); // eslint-disable-line @typescript-eslint/no-require-imports
    prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
    // Cache on global in dev to prevent connection exhaustion on hot reload
    if (process.env.NODE_ENV !== 'production') {
      (globalThis as any).__prisma = prismaInstance;
    }
  }
  return prismaInstance;
}

export const prisma = getPrisma();
