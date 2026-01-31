const Hapi = require('@hapi/hapi');
const fs = require('fs').promises;
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const plugin = require('./index.js');

describe('rest-fs plugin', () => {
    let server;
    let testDir;
    let debugServer;
    let debugServerPort;
    let spawnedProcessPids = []; // Track spawned debug proxy processes

    beforeAll(async () => {
        // Create test directory
        testDir = path.join(__dirname, '.test-data');
        await fs.mkdir(testDir, { recursive: true });

        // Start a mock debug server for testing
        debugServerPort = 9229;
        await startMockDebugServer();
    });

    afterAll(async () => {
        // Cleanup test directory
        try {
            await fs.rm(testDir, { recursive: true, force: true });
        } catch (err) {
            // Ignore errors
        }

        // Stop debug server
        if (debugServer) {
            await new Promise((resolve) => {
                debugServer.close(() => {
                    if (debugServer.wss) {
                        debugServer.wss.close(resolve);
                    } else {
                        resolve();
                    }
                });
            });
        }
    });

    beforeEach(async () => {
        // Create fresh Hapi server
        server = Hapi.server({
            port: 0, // Random port
            host: 'localhost'
        });

        // Register plugin
        await server.register({
            plugin,
            options: {
                baseDir: testDir,
                routePrefix: '/api/fs'
            }
        });

        await server.start();
    });

    afterEach(async () => {
        // Stop the Hapi server (this triggers onPreStop hook which should clean up debug proxy)
        await server.stop();
        
        // Explicitly terminate any spawned debug proxy processes to prevent orphaned processes
        // This ensures cleanup even if the server's onPreStop hook didn't complete in time
        for (const pid of spawnedProcessPids) {
            try {
                // Check if process exists before attempting to kill
                process.kill(pid, 0);
                // Process exists, terminate it
                process.kill(pid, 'SIGTERM');
                
                // Give it a moment to terminate gracefully
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Force kill if still alive
                try {
                    process.kill(pid, 0);
                    process.kill(pid, 'SIGKILL');
                } catch (err) {
                    // Process already terminated (expected)
                }
            } catch (err) {
                // Process doesn't exist (already cleaned up)
            }
        }
        
        // Clear the tracking array for next test
        spawnedProcessPids = [];
        
        // Additional wait to ensure ports are released
        await new Promise(resolve => setTimeout(resolve, 500));
    });

    /**
     * Start a mock debug server that mimics Node.js --inspect behavior
     */
    async function startMockDebugServer() {
        return new Promise((resolve) => {
            debugServer = http.createServer((req, res) => {
                res.setHeader('Content-Type', 'application/json');

                if (req.url === '/json' || req.url === '/json/list') {
                    res.end(JSON.stringify([
                        {
                            id: 'test-debug-session',
                            type: 'node',
                            title: 'test-process',
                            webSocketDebuggerUrl: `ws://localhost:${debugServerPort}/test-debug-session`,
                            devtoolsFrontendUrl: `devtools://devtools/bundled/inspector.html?ws=localhost:${debugServerPort}/test-debug-session`
                        }
                    ]));
                } else {
                    res.statusCode = 404;
                    res.end(JSON.stringify({ error: 'Not found' }));
                }
            });

            debugServer.wss = new WebSocket.Server({ server: debugServer });

            debugServer.wss.on('connection', (ws) => {
                // Echo back messages for testing
                ws.on('message', (data) => {
                    ws.send(data);
                });
            });

            debugServer.listen(debugServerPort, () => {
                resolve();
            });
        });
    }

    /**
     * Helper to start debug proxy and track its PID for cleanup
     */
    async function startDebugProxyAndTrack(payload, headers) {
        const res = await server.inject({
            method: 'POST',
            url: '/api/fs/debug-proxy/start',
            payload,
            headers
        });
        
        // If successfully started, track the PID for cleanup
        if (res.statusCode === 200 && res.result.status === 'started') {
            // Wait a moment for process to be fully spawned
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Get the PID from status endpoint
            const statusRes = await server.inject({
                method: 'GET',
                url: '/api/fs/debug-proxy/status'
            });
            
            if (statusRes.result.pid) {
                spawnedProcessPids.push(statusRes.result.pid);
            }
        }
        
        return res;
    }

    describe('filesystem operations', () => {
        describe('POST /mkdir', () => {
            it('should create a directory', async () => {
                const res = await server.inject({
                    method: 'POST',
                    url: '/api/fs/mkdir/test-dir'
                });

                expect(res.statusCode).toBe(200);
                expect(res.result).toMatchSnapshot();

                // Verify directory was created
                const stats = await fs.stat(path.join(testDir, 'test-dir'));
                expect(stats.isDirectory()).toBe(true);
            });

            it('should create nested directories', async () => {
                const res = await server.inject({
                    method: 'POST',
                    url: '/api/fs/mkdir/nested/path/test'
                });

                expect(res.statusCode).toBe(200);
                expect(res.result).toMatchSnapshot();
            });
        });

        describe('POST /write', () => {
            it('should write file contents', async () => {
                const content = Buffer.from('test content');

                const res = await server.inject({
                    method: 'POST',
                    url: '/api/fs/write/test-file.txt',
                    payload: content,
                    headers: {
                        'content-type': 'application/octet-stream'
                    }
                });

                expect(res.statusCode).toBe(200);
                expect(res.result).toMatchSnapshot();

                // Verify file contents
                const fileContent = await fs.readFile(path.join(testDir, 'test-file.txt'), 'utf8');
                expect(fileContent).toBe('test content');
            });
        });

        describe('GET /read', () => {
            it('should read file contents', async () => {
                // Create test file
                await fs.writeFile(path.join(testDir, 'read-test.txt'), 'file contents');

                const res = await server.inject({
                    method: 'GET',
                    url: '/api/fs/read/read-test.txt'
                });

                expect(res.statusCode).toBe(200);
                expect(res.payload).toBe('file contents');
            });

            it('should return 404 for non-existent file', async () => {
                const res = await server.inject({
                    method: 'GET',
                    url: '/api/fs/read/non-existent.txt'
                });

                expect(res.statusCode).toBe(404);
                expect(res.result).toMatchSnapshot();
            });
        });

        describe('GET /stat', () => {
            it('should return file metadata', async () => {
                // Create test file
                await fs.writeFile(path.join(testDir, 'stat-test.txt'), 'content');

                const res = await server.inject({
                    method: 'GET',
                    url: '/api/fs/stat/stat-test.txt'
                });

                expect(res.statusCode).toBe(200);
                expect(res.result).toHaveProperty('type', 'file');
                expect(res.result).toHaveProperty('size');
                expect(res.result).toHaveProperty('mtime');
                expect(res.result).toHaveProperty('ctime');
            });

            it('should return directory metadata', async () => {
                await fs.mkdir(path.join(testDir, 'stat-dir'), { recursive: true });

                const res = await server.inject({
                    method: 'GET',
                    url: '/api/fs/stat/stat-dir'
                });

                expect(res.statusCode).toBe(200);
                expect(res.result).toHaveProperty('type', 'directory');
            });

            it('should return 404 for non-existent path', async () => {
                const res = await server.inject({
                    method: 'GET',
                    url: '/api/fs/stat/does-not-exist'
                });

                expect(res.statusCode).toBe(404);
                expect(res.result).toMatchSnapshot();
            });
        });

        describe('GET /readdir', () => {
            it('should list directory contents', async () => {
                const dirPath = path.join(testDir, 'readdir-test');
                await fs.mkdir(dirPath, { recursive: true });
                await fs.writeFile(path.join(dirPath, 'file1.txt'), 'content');
                await fs.writeFile(path.join(dirPath, 'file2.txt'), 'content');
                await fs.mkdir(path.join(dirPath, 'subdir'));

                const res = await server.inject({
                    method: 'GET',
                    url: '/api/fs/readdir/readdir-test'
                });

                expect(res.statusCode).toBe(200);
                expect(Array.isArray(res.result)).toBe(true);
                expect(res.result).toHaveLength(3);

                const names = res.result.map(item => item.name).sort();
                expect(names).toEqual(['file1.txt', 'file2.txt', 'subdir']);
            });

            it('should return 404 for non-existent directory', async () => {
                const res = await server.inject({
                    method: 'GET',
                    url: '/api/fs/readdir/non-existent'
                });

                expect(res.statusCode).toBe(404);
                expect(res.result).toMatchSnapshot();
            });
        });

        describe('POST /rename', () => {
            it('should rename a file', async () => {
                await fs.writeFile(path.join(testDir, 'old-name.txt'), 'content');

                const res = await server.inject({
                    method: 'POST',
                    url: '/api/fs/rename',
                    payload: {
                        oldPath: 'old-name.txt',
                        newPath: 'new-name.txt'
                    }
                });

                expect(res.statusCode).toBe(200);
                expect(res.result).toMatchSnapshot();

                // Verify rename
                const exists = await fs.access(path.join(testDir, 'new-name.txt'))
                    .then(() => true)
                    .catch(() => false);
                expect(exists).toBe(true);
            });
        });

        describe('POST /copy', () => {
            it('should copy a file', async () => {
                await fs.writeFile(path.join(testDir, 'source.txt'), 'source content');

                const res = await server.inject({
                    method: 'POST',
                    url: '/api/fs/copy',
                    payload: {
                        source: 'source.txt',
                        destination: 'destination.txt'
                    }
                });

                expect(res.statusCode).toBe(200);
                expect(res.result).toMatchSnapshot();

                // Verify copy
                const content = await fs.readFile(path.join(testDir, 'destination.txt'), 'utf8');
                expect(content).toBe('source content');
            });

            it('should copy a directory recursively', async () => {
                const sourceDir = path.join(testDir, 'source-dir');
                await fs.mkdir(sourceDir, { recursive: true });
                await fs.writeFile(path.join(sourceDir, 'file.txt'), 'content');

                const res = await server.inject({
                    method: 'POST',
                    url: '/api/fs/copy',
                    payload: {
                        source: 'source-dir',
                        destination: 'dest-dir'
                    }
                });

                expect(res.statusCode).toBe(200);

                // Verify copy
                const content = await fs.readFile(path.join(testDir, 'dest-dir', 'file.txt'), 'utf8');
                expect(content).toBe('content');
            });
        });

        describe('DELETE /delete', () => {
            it('should delete a file', async () => {
                await fs.writeFile(path.join(testDir, 'delete-me.txt'), 'content');

                const res = await server.inject({
                    method: 'DELETE',
                    url: '/api/fs/delete/delete-me.txt'
                });

                expect(res.statusCode).toBe(200);
                expect(res.result).toMatchSnapshot();

                // Verify deletion
                const exists = await fs.access(path.join(testDir, 'delete-me.txt'))
                    .then(() => true)
                    .catch(() => false);
                expect(exists).toBe(false);
            });

            it('should delete a directory recursively', async () => {
                const dirPath = path.join(testDir, 'delete-dir');
                await fs.mkdir(dirPath, { recursive: true });
                await fs.writeFile(path.join(dirPath, 'file.txt'), 'content');

                const res = await server.inject({
                    method: 'DELETE',
                    url: '/api/fs/delete/delete-dir?recursive=true'
                });

                expect(res.statusCode).toBe(200);

                // Verify deletion
                const exists = await fs.access(dirPath)
                    .then(() => true)
                    .catch(() => false);
                expect(exists).toBe(false);
            });

            it('should return 404 for non-existent path', async () => {
                const res = await server.inject({
                    method: 'DELETE',
                    url: '/api/fs/delete/does-not-exist'
                });

                expect(res.statusCode).toBe(404);
                expect(res.result).toMatchSnapshot();
            });
        });
    });

    describe('debug proxy operations', () => {
        describe('POST /debug-proxy/start', () => {
            it('should start debug proxy process', async () => {
                const res = await startDebugProxyAndTrack({
                    targetPort: debugServerPort,
                    proxyPort: 9230
                }, { Authorization: 'Bearer test-bearer-token-12345' });

                expect(res.statusCode).toBe(200);
                expect(res.result).toHaveProperty('status', 'started');
                expect(res.result).toHaveProperty('port', 9230);
                expect(res.result).toHaveProperty('message');
            }, 10000);

            it('should return error if token is missing', async () => {
                const res = await server.inject({
                    method: 'POST',
                    url: '/api/fs/debug-proxy/start',
                    payload: {}
                });

                expect(res.statusCode).toBe(400);
                expect(res.result).toMatchSnapshot();
            });

            it('should report already running if called twice', async () => {
                // First call
                await startDebugProxyAndTrack({
                    targetPort: debugServerPort,
                    proxyPort: 9231
                }, { Authorization: 'Bearer test-token' });

                // Wait for process to start
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Second call
                const res = await server.inject({
                    method: 'POST',
                    url: '/api/fs/debug-proxy/start',
                    payload: {
                        targetPort: debugServerPort,
                        proxyPort: 9231
                    },
                    headers: { Authorization: 'Bearer test-token' }
                });

                expect(res.statusCode).toBe(200);
                expect(res.result).toHaveProperty('status', 'already_running');
            }, 15000);
        });

        describe('GET /debug-proxy/status', () => {
            it('should return status when proxy is not running', async () => {
                const res = await server.inject({
                    method: 'GET',
                    url: '/api/fs/debug-proxy/status'
                });

                expect(res.statusCode).toBe(200);
                expect(res.result).toHaveProperty('running', false);
                expect(res.result).toHaveProperty('port', null);
                expect(res.result).toHaveProperty('pid', null);
            });

            it('should return status when proxy is running', async () => {
                // Start proxy
                await startDebugProxyAndTrack({
                    targetPort: debugServerPort,
                    proxyPort: 9232
                }, { Authorization: 'Bearer test-token' });

                // Wait for startup
                await new Promise(resolve => setTimeout(resolve, 1000));

                const res = await server.inject({
                    method: 'GET',
                    url: '/api/fs/debug-proxy/status'
                });

                expect(res.statusCode).toBe(200);
                expect(res.result).toHaveProperty('running', true);
                expect(res.result).toHaveProperty('port', 9232);
                expect(res.result.pid).toBeGreaterThan(0);
            }, 10000);
        });

        describe('debug proxy functionality', () => {
            let proxyPort;

            beforeEach(async () => {
                proxyPort = 9233;

                // Start the proxy
                await startDebugProxyAndTrack({
                    targetPort: debugServerPort,
                    proxyPort
                }, { Authorization: 'Bearer test-proxy-token' });

                // Wait for proxy to be ready
                await new Promise(resolve => setTimeout(resolve, 1500));
            }, 10000);

            it('should proxy /json/list endpoint with authentication', async () => {
                return new Promise((resolve, reject) => {
                    const options = {
                        hostname: 'localhost',
                        port: proxyPort,
                        path: '/json/list',
                        method: 'GET',
                        headers: {
                            'Authorization': 'Bearer test-proxy-token'
                        }
                    };

                    const req = http.request(options, (res) => {
                        let data = '';
                        res.on('data', chunk => data += chunk);
                        res.on('end', () => {
                            try {
                                expect(res.statusCode).toBe(200);
                                const targets = JSON.parse(data);
                                expect(Array.isArray(targets)).toBe(true);
                                expect(targets[0]).toHaveProperty('webSocketDebuggerUrl');
                                expect(targets[0].webSocketDebuggerUrl).toContain(`localhost:${proxyPort}`);
                                resolve();
                            } catch (err) {
                                reject(err);
                            }
                        });
                    });

                    req.on('error', reject);
                    req.end();
                });
            }, 10000);

            it('should reject requests without authentication', async () => {
                return new Promise((resolve, reject) => {
                    const options = {
                        hostname: 'localhost',
                        port: proxyPort,
                        path: '/json/list',
                        method: 'GET'
                    };

                    const req = http.request(options, (res) => {
                        let data = '';
                        res.on('data', chunk => data += chunk);
                        res.on('end', () => {
                            try {
                                expect(res.statusCode).toBe(401);
                                const result = JSON.parse(data);
                                expect(result).toHaveProperty('error');
                                resolve();
                            } catch (err) {
                                reject(err);
                            }
                        });
                    });

                    req.on('error', reject);
                    req.end();
                });
            }, 10000);

            it('should reject requests with invalid token', async () => {
                return new Promise((resolve, reject) => {
                    const options = {
                        hostname: 'localhost',
                        port: proxyPort,
                        path: '/json/list',
                        method: 'GET',
                        headers: {
                            'Authorization': 'Bearer wrong-token'
                        }
                    };

                    const req = http.request(options, (res) => {
                        let data = '';
                        res.on('data', chunk => data += chunk);
                        res.on('end', () => {
                            try {
                                expect(res.statusCode).toBe(403);
                                const result = JSON.parse(data);
                                expect(result).toHaveProperty('error');
                                resolve();
                            } catch (err) {
                                reject(err);
                            }
                        });
                    });

                    req.on('error', reject);
                    req.end();
                });
            }, 10000);
        });
    });

    describe('security', () => {
        it('should prevent path traversal attacks', async () => {
            const res = await server.inject({
                method: 'GET',
                url: '/api/fs/read/../../../etc/passwd'
            });

            expect(res.statusCode).toBe(404);
        });
    });

    describe('process cleanup', () => {
        it('should terminate debug proxy when server stops', async () => {
            // Start proxy
            const startRes = await startDebugProxyAndTrack({
                targetPort: debugServerPort,
                proxyPort: 9234
            }, { Authorization: 'Bearer cleanup-test-token' });

            expect(startRes.result.status).toBe('started');

            // Wait for startup
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Get PID
            const statusRes = await server.inject({
                method: 'GET',
                url: '/api/fs/debug-proxy/status'
            });

            const pid = statusRes.result.pid;
            expect(pid).toBeGreaterThan(0);

            // Stop server
            await server.stop();

            // Wait for cleanup
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Verify process is terminated
            try {
                process.kill(pid, 0); // Check if process exists
                // If we get here, process still exists (shouldn't happen)
                expect(true).toBe(false);
            } catch (err) {
                // Process doesn't exist anymore (expected)
                expect(err.code).toBe('ESRCH');
            }
        }, 15000);
    });
});
