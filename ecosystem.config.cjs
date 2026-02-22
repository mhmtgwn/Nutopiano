module.exports = {
  apps: [
    {
      name: process.env.BACKEND_PM2_NAME || 'nutopiano-api',
      cwd: process.env.BACKEND_DIR || '/var/www/nutopiano_app/backend',
      script: 'dist/main.js',
      interpreter: 'node',
      node_args: ['-r', 'tsconfig-paths/register'],
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.BACKEND_PORT || '3001',
        PRISMA_CLIENT_ENGINE_TYPE: process.env.PRISMA_CLIENT_ENGINE_TYPE || 'binary',
      },
    },
    {
      name: process.env.FRONTEND_PM2_NAME || 'nutopiano-web',
      cwd: process.env.FRONTEND_DIR || '/var/www/nutopiano_app/frontend',
      script: 'npm',
      args: 'run start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.FRONTEND_PORT || '3000',
      },
    },
  ],
};
