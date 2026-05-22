'use strict';

require('dotenv').config();

const { Pool } = require('pg');

const normalizedDatabaseUrl = (value) => {
	if (!value) return undefined;
	return String(value)
		.trim()
		.replace(/^DATABASE_URL\s*=\s*/i, '')
		.replace(/^['\"]+|['\"]+$/g, '');
};

const connectionString = normalizedDatabaseUrl(process.env.DATABASE_URL);
if (!connectionString) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

const sslMode = String(process.env.PGSSLMODE || 'require').toLowerCase();
const ssl = sslMode === 'disable' ? false : { rejectUnauthorized: false };

const url = new URL(connectionString);

(async () => {
	const pool = new Pool({
		host: url.hostname,
		port: url.port ? Number(url.port) : 5432,
		database: url.pathname.replace(/^\//, ''),
		user: url.username,
		password: url.password,
		ssl,
	});

	const result = await pool.query(
		[
			"select table_name",
			"from information_schema.tables",
			"where table_schema = 'public'",
			"  and table_type = 'BASE TABLE'",
			"order by table_name",
		].join('\n')
	);

	console.log(result.rows.map((r) => r.table_name));
	await pool.end();
})().catch((err) => {
	console.error(err);
	process.exit(1);
});
