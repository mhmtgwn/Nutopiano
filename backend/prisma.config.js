require('dotenv/config');

const { defineConfig } = require('prisma/config');

module.exports = defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'powershell -Command "$env:PRISMA_CLIENT_ENGINE_TYPE=\"binary\"; node prisma/seed.js"',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});