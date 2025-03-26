const { knexSnakeCaseMappers } = require('objection');

module.exports = {
  client: 'mysql',
  connection: {
    host: '127.0.0.1',
    user: 'bigcapital',
    password: 'bigcapital',
    database: 'bigcapital_system',
    charset: 'utf8',
  },
  migrations: {
    directory: './src/database/migrations',
  },
  pool: { min: 0, max: 7 },
  ...knexSnakeCaseMappers({ upperCase: true }),
};
