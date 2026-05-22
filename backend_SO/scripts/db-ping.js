'use strict';

require('dotenv').config();

const prisma = require('../db/prisma');

(async () => {
	const result = await prisma.$queryRaw`select now() as now, current_user as current_user`;
	console.log(Array.isArray(result) ? result[0] : result);
	await prisma.$disconnect();
})().catch((err) => {
	console.error(err);
	process.exit(1);
});
