// Prisma CLI config (Prisma v7+)
import "dotenv/config";
import { defineConfig } from "prisma/config";

const normalizeDatabaseUrl = (value: string | undefined) => {
	if (!value) return undefined;
	return value
		.trim()
		.replace(/^DATABASE_URL\s*=\s*/i, "")
		.replace(/^['\"]+|['\"]+$/g, "");
};

export default defineConfig({
	schema: "prisma/schema.prisma",
	migrations: {
		path: "prisma/migrations",
	},
	datasource: {
		url: normalizeDatabaseUrl(
			process.env["DIRECT_URL"] ??
				process.env["DIRECT_DATABASE_URL"] ??
				process.env["DATABASE_URL"]
		),
	},
});
