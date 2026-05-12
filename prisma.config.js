require('dotenv').config();
const { defineConfig } = require('prisma/config');

module.exports = defineConfig({
  schema: './prisma/postgres/schema.prisma',
  datasource: {
    url: process.env.POSTGRES_URL,
  },
});
