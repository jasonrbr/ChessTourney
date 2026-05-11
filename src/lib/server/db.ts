import { dev } from '$app/environment';
import { DATABASE_URL } from '$env/static/private';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
	globalForPrisma.prisma ?? new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });

if (dev) {
	globalForPrisma.prisma = prisma;
}
