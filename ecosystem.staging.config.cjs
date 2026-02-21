module.exports = {
  apps: [
    {
      name: process.env.BACKEND_PM2_NAME || 'nutopiano-api-staging',
      cwd: process.env.BACKEND_DIR || '/var/www/nutopiano_app_staging/backend',
      script: 'npm',
      args: 'run start:prod',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'staging',
        PORT: process.env.BACKEND_PORT || '3101',
        PRISMA_CLIENT_ENGINE_TYPE: process.env.PRISMA_CLIENT_ENGINE_TYPE || 'binary',
      },
    },
    {
      name: process.env.FRONTEND_PM2_NAME || 'nutopiano-web-staging',
      cwd: process.env.FRONTEND_DIR || '/var/www/nutopiano_app_staging/frontend',
      script: 'npm',
      args: 'run start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'staging',
        PORT: process.env.FRONTEND_PORT || '3100',
      },
    },
  ],
};
