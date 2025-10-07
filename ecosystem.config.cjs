module.exports = {
  apps: [
    {
      name: 'lifeflow-backend',
      script: './server.js',
      cwd: '/var/www/rsweeting/frontend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: '/var/www/rsweeting/logs/backend-error.log',
      out_file: '/var/www/rsweeting/logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
