const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

/**
 * Hapi plugin for REST filesystem operations
 *
 * Usage:
 *
 * const server = Hapi.server({ ... });
 * await server.register({
 *   plugin: require('./restfs-plugin'),
 *   options: {
 *     baseDir: path.join(__dirname, 'data'),
 *     routePrefix: '/api/fs'
 *   }
 * });
 */

/**
 * Helper to resolve paths safely within the base directory
 */
function createPathResolver(baseDir) {
    return function resolvePath(requestPath) {
        const safePath = path.join(baseDir, requestPath || '/');
        if (!safePath.startsWith(baseDir)) {
            throw new Error('Invalid path');
        }
        return safePath;
    };
}

module.exports = {
    name: 'rest-fs',
    version: '1.0.0',

    register: async function (server, options) {
        const baseDir = options.baseDir || path.join(process.cwd(), 'data');
        const routePrefix = options.routePrefix || '/api/fs';
        const resolvePath = createPathResolver(baseDir);

        // Debug proxy child process management
        let debugProxyProcess = null;
        let debugProxyPort = null;

        /**
         * Check whether the current debug proxy process is still alive.
         * Uses child process properties and a signal(0) probe to avoid
         * returning "alreadyRunning" for a dead process.
         */
        function isDebugProxyAlive() {
            if (!debugProxyProcess) {
                return false;
            }

            // If Node has already recorded an exit code, the process is not running.
            if (debugProxyProcess.exitCode !== null) {
                return false;
            }

            // As a best-effort liveness check, send signal 0 to the child PID.
            // - If the process does not exist, this will throw with code 'ESRCH' or 'EINVAL'.
            // - If we don't have permission to signal it (e.g. EPERM), assume it's alive.
            try {
                if (typeof debugProxyProcess.pid === 'number') {
                    process.kill(debugProxyProcess.pid, 0);
                }
                return true;
            } catch (err) {
                if (err && (err.code === 'ESRCH' || err.code === 'EINVAL')) {
                    return false;
                }
                return true;
            }
        }

        /**
         * Spawn debug proxy child process
         * Returns a promise that resolves when the process confirms it's listening
         * or rejects if it fails to start within the timeout period.
         */
        async function spawnDebugProxy(token, targetPort = 9229, proxyPort = 9230) {
            if (isDebugProxyAlive()) {
                return { alreadyRunning: true, port: debugProxyPort };
            }

            const debugProxyScript = path.join(__dirname, 'debug-proxy.js');

            return new Promise((resolve, reject) => {
                const startupTimeout = 5000; // 5 seconds timeout
                let startupTimer = null;
                let startupOutputListener = null;
                let startupErrorListener = null;
                let startupExitListener = null;

                const cleanup = () => {
                    if (startupTimer) {
                        clearTimeout(startupTimer);
                        startupTimer = null;
                    }
                    if (startupOutputListener && debugProxyProcess) {
                        debugProxyProcess.stdout.removeListener('data', startupOutputListener);
                    }
                    if (startupErrorListener && debugProxyProcess) {
                        debugProxyProcess.removeListener('error', startupErrorListener);
                    }
                    if (startupExitListener && debugProxyProcess) {
                        debugProxyProcess.removeListener('exit', startupExitListener);
                    }
                };

                const failStartup = (reason) => {
                    cleanup();
                    debugProxyProcess = null;
                    debugProxyPort = null;
                    reject(new Error(reason));
                };

                const succeedStartup = () => {
                    cleanup();
                    
                    // Set up permanent event handlers for ongoing operation
                    debugProxyProcess.stdout.on('data', (data) => {
                        console.log(`[Debug Proxy] ${data.toString().trim()}`);
                    });

                    debugProxyProcess.stderr.on('data', (data) => {
                        console.error(`[Debug Proxy Error] ${data.toString().trim()}`);
                    });

                    debugProxyProcess.on('exit', (code, signal) => {
                        console.log(`[Debug Proxy] Process terminated with code ${code}, signal ${signal}`);
                        debugProxyProcess = null;
                        debugProxyPort = null;
                    });

                    debugProxyProcess.on('error', (err) => {
                        console.error(`[Debug Proxy] Unexpected error:`, err);
                        debugProxyProcess = null;
                        debugProxyPort = null;
                    });

                    resolve({ started: true, port: proxyPort });
                };

                debugProxyProcess = spawn('node', [debugProxyScript], {
                    env: {
                        ...process.env,
                        DEBUG_PROXY_TOKEN: token,
                        DEBUG_TARGET: `ws://localhost:${targetPort}`,
                        DEBUG_PROXY_PORT: proxyPort.toString(),
                    },
                    stdio: ['ignore', 'pipe', 'pipe'],
                    detached: false, // Ensure child terminates with parent
                });

                debugProxyPort = proxyPort;

                // Listen for the "listening" message to confirm successful startup
                startupOutputListener = (data) => {
                    const output = data.toString();
                    console.log(`[Debug Proxy] ${output.trim()}`);
                    
                    // Check if the process has started listening
                    if (output.includes('Debug proxy listening on')) {
                        succeedStartup();
                    }
                };

                debugProxyProcess.stdout.on('data', startupOutputListener);

                debugProxyProcess.stderr.on('data', (data) => {
                    console.error(`[Debug Proxy Error] ${data.toString().trim()}`);
                });

                // Handle process exit during startup
                startupExitListener = (code, signal) => {
                    console.log(`[Debug Proxy] Process exited with code ${code}, signal ${signal}`);
                    debugProxyProcess = null;
                    debugProxyPort = null;
                    
                    if (startupTimer) {
                        // If we're still in startup phase, this is a failure
                        failStartup(`Process exited prematurely with code ${code}`);
                    }
                };

                debugProxyProcess.on('exit', startupExitListener);

                // Handle spawn errors
                startupErrorListener = (err) => {
                    console.error(`[Debug Proxy] Failed to start:`, err);
                    failStartup(`Failed to spawn process: ${err.message}`);
                };

                debugProxyProcess.on('error', startupErrorListener);

                // Set timeout for startup
                startupTimer = setTimeout(() => {
                    failStartup('Process failed to start within timeout period');
                }, startupTimeout);
            });
        }

        /**
         * Cleanup on server stop
         */
        server.ext('onPreStop', async () => {
            if (debugProxyProcess && !debugProxyProcess.killed) {
                console.log('[Debug Proxy] Terminating child process...');
                debugProxyProcess.kill('SIGTERM');

                // Give it a moment to clean up, then force kill if needed
                await new Promise(resolve => setTimeout(resolve, 1000));
                if (debugProxyProcess && !debugProxyProcess.killed) {
                    debugProxyProcess.kill('SIGKILL');
                }
            }
        });

        // POST /debug-proxy/start - Start debug proxy
        server.route({
            method: 'POST',
            options: options.options || {},
            path: `${routePrefix}/debug-proxy/start`,
            handler: async (request, h) => {
                try {
                    const { targetPort = 9229, proxyPort = 9230 } = request.payload || {};
                    const authHeader = request.headers['authorization'];
                    let token;

                    if (typeof authHeader === 'string') {
                        const match = authHeader.match(/^Bearer\s+(.+)$/i);
                        if (match && match[1]) {
                            token = match[1].trim();
                        }
                    }
                    if (!token) {
                        return h.response({ error: 'Bearer token is required' }).code(400);
                    }

                    const result = await spawnDebugProxy(token, targetPort, proxyPort);

                    if (result.alreadyRunning) {
                        return {
                            status: 'already_running',
                            port: result.port,
                            message: 'Debug proxy is already running'
                        };
                    }

                    return {
                        status: 'started',
                        port: result.port,
                        message: 'Debug proxy started successfully'
                    };
                } catch (error) {
                    console.error('[Debug Proxy] Start failed:', error.message);
                    return h.response({ 
                        error: 'Failed to start debug proxy',
                        details: error.message 
                    }).code(500);
                }
            }
        });

        // GET /debug-proxy/status - Get debug proxy status
        server.route({
            method: 'GET',
            options: options.options || {},
            path: `${routePrefix}/debug-proxy/status`,
            handler: async (request, h) => {
                const running = !!(debugProxyProcess && !debugProxyProcess.killed);
                return {
                    running,
                    port: debugProxyPort,
                    pid: running ? debugProxyProcess.pid : null
                };
            }
        });

        // GET /stat/{path*} - Get file/directory metadata
        server.route({
            method: 'GET',
            options: options.options || {},
            path: `${routePrefix}/stat/{path*}`,
            handler: async (request, h) => {
                try {
                    const requestPath = request.params.path || '/';
                    const fullPath = resolvePath(requestPath);

                    const stats = await fs.stat(fullPath);

                    const symLink = stats.isSymbolicLink() ? true : undefined;
                    let actualType = stats.isDirectory() ? 'directory' : 'file';

                    // If it's a symlink, resolve it to get the actual type
                    if (symLink) {
                        try {
                            const realPath = await fs.realpath(fullPath);
                            const realStats = await fs.stat(realPath);
                            actualType = realStats.isDirectory() ? 'directory' : 'file';
                        } catch (err) {
                            // If we can't resolve the symlink (broken link), mark it as symlink
                            actualType = 'symlink';
                        }
                    }

                    return {
                        type: actualType,
                        symLink,
                        ctime: stats.ctimeMs,
                        mtime: stats.mtimeMs,
                        size: stats.size,
                    };
                } catch (error) {
                    return h.response({ error: 'Not found' }).code(404);
                }
            }
        });

        // GET /readdir/{path*} - List directory contents
        server.route({
            method: 'GET',
            options: options.options || {},
            path: `${routePrefix}/readdir/{path*}`,
            handler: async (request, h) => {
                try {
                    const requestPath = request.params.path || '/';
                    const fullPath = resolvePath(requestPath);

                    const entries = await fs.readdir(fullPath, { withFileTypes: true });

                    const results = await Promise.all(
                        entries.map(async (entry) => {
                            const symLink = entry.isSymbolicLink() ? true : undefined;
                            let actualType = entry.isDirectory() ? 'directory' : 'file';

                            // If it's a symlink, resolve it to get the actual type
                            if (symLink) {
                                try {
                                    const entryPath = path.join(fullPath, entry.name);
                                    const realPath = await fs.realpath(entryPath);
                                    const realStats = await fs.stat(realPath);
                                    actualType = realStats.isDirectory() ? 'directory' : 'file';
                                } catch (err) {
                                    // If we can't resolve the symlink (broken link), mark it as symlink
                                    actualType = 'symlink';
                                }
                            }

                            return {
                                name: entry.name,
                                type: actualType,
                                symLink,
                            };
                        })
                    );

                    return results;
                } catch (error) {
                    return h.response({ error: 'Directory not found' }).code(404);
                }
            }
        });

        // POST /mkdir/{path*} - Create directory
        server.route({
            method: 'POST',
            options: options.options || {},
            path: `${routePrefix}/mkdir/{path*}`,
            handler: async (request, h) => {
                try {
                    const requestPath = request.params.path || '/';
                    const fullPath = resolvePath(requestPath);

                    await fs.mkdir(fullPath, { recursive: true });
                    return { success: true };
                } catch (error) {
                    return h.response({ error: error.message }).code(500);
                }
            }
        });

        // GET /read/{path*} - Read file contents
        server.route({
            method: 'GET',
            options: options.options || {},
            path: `${routePrefix}/read/{path*}`,
            handler: async (request, h) => {
                try {
                    const requestPath = request.params.path || '/';
                    const fullPath = resolvePath(requestPath);

                    const content = await fs.readFile(fullPath);
                    return h.response(content).type('application/octet-stream');
                } catch (error) {
                    return h.response({ error: 'File not found' }).code(404);
                }
            }
        });

        // POST /write/{path*} - Write file contents
        server.route({
            method: 'POST',
            path: `${routePrefix}/write/{path*}`,
            options: {
                ...options.options,
                payload: {
                    output: 'data',
                    parse: false,
                    allow: 'application/octet-stream',
                    maxBytes: options.maxFileSize || 52428800, // Default 50MB
                }
            },
            handler: async (request, h) => {
                try {
                    const requestPath = request.params.path || '/';
                    const fullPath = resolvePath(requestPath);

                    // Ensure parent directory exists
                    await fs.mkdir(path.dirname(fullPath), { recursive: true });

                    await fs.writeFile(fullPath, request.payload);
                    return { success: true };
                } catch (error) {
                    return h.response({ error: error.message }).code(500);
                }
            }
        });

        // DELETE /delete/{path*} - Delete file or directory
        server.route({
            method: 'DELETE',
            options: options.options || {},
            path: `${routePrefix}/delete/{path*}`,
            handler: async (request, h) => {
                try {
                    const requestPath = request.params.path || '/';
                    const fullPath = resolvePath(requestPath);
                    const recursive = request.query.recursive === 'true';

                    const stats = await fs.stat(fullPath);

                    if (stats.isDirectory()) {
                        await fs.rm(fullPath, { recursive });
                    } else {
                        await fs.unlink(fullPath);
                    }

                    return { success: true };
                } catch (error) {
                    return h.response({ error: 'Not found' }).code(404);
                }
            }
        });

        // POST /rename - Rename/move file or directory
        server.route({
            method: 'POST',
            options: options.options || {},
            path: `${routePrefix}/rename`,
            handler: async (request, h) => {
                try {
                    const { oldPath, newPath } = request.payload;
                    const oldFullPath = resolvePath(oldPath);
                    const newFullPath = resolvePath(newPath);

                    await fs.rename(oldFullPath, newFullPath);
                    return { success: true };
                } catch (error) {
                    return h.response({ error: error.message }).code(500);
                }
            }
        });

        // POST /copy - Copy file or directory
        server.route({
            method: 'POST',
            options: options.options || {},
            path: `${routePrefix}/copy`,
            handler: async (request, h) => {
                try {
                    const { source, destination } = request.payload;
                    const sourceFullPath = resolvePath(source);
                    const destFullPath = resolvePath(destination);

                    const stats = await fs.stat(sourceFullPath);

                    if (stats.isDirectory()) {
                        await fs.cp(sourceFullPath, destFullPath, { recursive: true });
                    } else {
                        await fs.copyFile(sourceFullPath, destFullPath);
                    }

                    return { success: true };
                } catch (error) {
                    return h.response({ error: error.message }).code(500);
                }
            }
        });

        console.log(`REST Filesystem plugin registered at ${routePrefix}`);
        console.log(`Base directory: ${baseDir}`);
    }
};
