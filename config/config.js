const dotenv = require("dotenv");

dotenv.config({
  path: !!process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : ".env",
});
// loading .env file

module.exports = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  host: process.env.DB_HOST,
  dialect: "mysql",
  logging: false
};
