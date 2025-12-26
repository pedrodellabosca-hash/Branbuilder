/**
 * PM2 Ecosystem Configuration
 * 
 * Runs both the Next.js web server and the background worker
 * in a single container for simple "all-in-one" deployment.
 */

module.exports = {
    apps: [
        {
            name: 'web',
            script: 'server.js',
            instances: 1,
            exec_mode: 'fork',
            autorestart: true,
            watch: false,
            max_memory_restart: '512M',
            env: {
                NODE_ENV: 'production',
                PORT: 3000,
            },
            // Graceful shutdown
            kill_timeout: 10000,
            wait_ready: true,
            listen_timeout: 30000,
        },
        {
            name: 'worker',
            script: 'node_modules/.bin/tsx',
            args: 'lib/jobs/worker.ts',
            instances: 1,
            exec_mode: 'fork',
            autorestart: true,
            watch: false,
            max_memory_restart: '256M',
            // Worker polls for jobs, so restart delay helps avoid thrashing
            restart_delay: 5000,
            env: {
                NODE_ENV: 'production',
            },
            // Graceful shutdown - give worker time to finish current job
            kill_timeout: 30000,
        },
    ],
};
