'use strict';

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool, types } = require('pg');

// Force pg to parse TIMESTAMP WITHOUT TIME ZONE (OID 1114) as UTC
types.setTypeParser(1114, function(stringValue) {
  return new Date(stringValue + 'Z');
});

const normalizedDatabaseUrl = (value) => {
	if (!value) return undefined;
	return String(value)
		.trim()
		.replace(/^DATABASE_URL\s*=\s*/i, '')
		.replace(/^['\"]+|['\"]+$/g, '');
};

const connectionString = normalizedDatabaseUrl(process.env.DATABASE_URL);
if (!connectionString) {
	const error = new Error(
		'DATABASE_URL is not set. Create a .env file (see .env.example).'
	);
	error.code = 'MISSING_DATABASE_URL';
	throw error;
}

const sslMode = String(process.env.PGSSLMODE || 'require').toLowerCase();
const ssl = sslMode === 'disable' ? false : { rejectUnauthorized: false };

const url = new URL(connectionString);

const pool =
	globalThis.__prismaPgPool ||
	new Pool({
		host: url.hostname,
		port: url.port ? Number(url.port) : 5432,
		database: url.pathname.replace(/^\//, ''),
		user: url.username,
		password: url.password,
		ssl,
		max: process.env.PG_POOL_MAX ? Number(process.env.PG_POOL_MAX) : undefined,
	});

if (process.env.NODE_ENV !== 'production') {
	globalThis.__prismaPgPool = pool;
}

const adapter = new PrismaPg(pool);

const prisma = globalThis.__prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
	globalThis.__prisma = prisma;
}

module.exports = prisma;
