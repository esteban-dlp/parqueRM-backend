export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),

  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT ?? '1433', 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCert: process.env.DB_TRUST_SERVER_CERT !== 'false',
  },

  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },

  admin: {
    bootstrap: process.env.ADMIN_BOOTSTRAP === 'true',
    username: process.env.ADMIN_USERNAME,
    password: process.env.ADMIN_PASSWORD,
    fullName: process.env.ADMIN_FULL_NAME ?? 'Administrador',
    email: process.env.ADMIN_EMAIL,
  },
});
