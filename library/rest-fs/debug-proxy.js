#!/usr/bin/env node

/**
 * Debug Proxy Server
 *
 * Proxies Node.js debug protocol (WebSocket + HTTP) with bearer token authentication.
 * Receives bearer token via DEBUG_PROXY_TOKEN environment variable.
 */

const http = require('http');
const { createProxyMiddleware } = require('http-proxy-middleware');
const WebSocket = require('ws');

const PORT = process.env.DEBUG_PROXY_PORT || 9230;
const DEBUG_TARGET = process.env.DEBUG_TARGET || 'ws://localhost:9229';
const BEARER_TOKEN = process.env.DEBUG_PROXY_TOKEN;

if (!BEARER_TOKEN) {
    console.error('ERROR: DEBUG_PROXY_TOKEN environment variable is required');
    process.exit(1);
}

/**
 * Verify bearer token from request
 */
function verifyToken(req, res) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Authorization header required' }));
        return false;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid authorization format. Use: Bearer <token>' }));
        return false;
    }

    const token = parts[1];
    if (token !== BEARER_TOKEN) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid token' }));
        return false;
    }

    return true;
}

/**
 * Create HTTP server for debug protocol endpoints
 */
const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Verify authentication
    if (!verifyToken(req, res)) {
        return;
    }

    // Handle /json/list endpoint (debug targets list)
    if (req.url === '/json' || req.url === '/json/list') {
        const targetUrl = DEBUG_TARGET.replace('ws://', 'http://').replace('wss://', 'https://');

        http.get(`${targetUrl}/json/list`, (proxyRes) => {
            let data = '';
            proxyRes.on('data', chunk => data += chunk);
            proxyRes.on('end', () => {
                try {
                    const targets = JSON.parse(data);
                    // Rewrite WebSocket URLs to point to our proxy
                    const rewritten = targets.map(target => ({
                        ...target,
                        webSocketDebuggerUrl: target.webSocketDebuggerUrl
                            ? target.webSocketDebuggerUrl.replace(/ws:\/\/[^/]+/, `ws://localhost:${PORT}`)
                            : undefined,
                        devtoolsFrontendUrl: target.devtoolsFrontendUrl
                            ? target.devtoolsFrontendUrl.replace(/ws=[^&]+/, `ws=localhost:${PORT}${target.webSocketDebuggerUrl?.split('/').pop() || ''}`)
                            : undefined
                    }));

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(rewritten));
                } catch (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to parse debug targets' }));
                }
            });
        }).on('error', (err) => {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to connect to debug target', message: err.message }));
        });
        return;
    }

    // Handle other JSON endpoints
    if (req.url.startsWith('/json')) {
        const targetUrl = DEBUG_TARGET.replace('ws://', 'http://').replace('wss://', 'https://');

        http.get(`${targetUrl}${req.url}`, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
        }).on('error', (err) => {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to connect to debug target', message: err.message }));
        });
        return;
    }

    // Default response
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
});

/**
 * Create WebSocket server for debug protocol
 */
const wss = new WebSocket.Server({ server });

// Handle WebSocket server errors (including server binding errors)
wss.on('error', (err) => {
    // These errors are typically propagated from the underlying HTTP server
    // The HTTP server error handler will handle them, so we just log here
    console.error(`[${new Date().toISOString()}] WebSocket server error:`, err.message);
});

wss.on('connection', (clientWs, req) => {
    // Verify authentication from WebSocket upgrade request
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        clientWs.close(1008, 'Authorization header required');
        return;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer' || parts[1] !== BEARER_TOKEN) {
        clientWs.close(1008, 'Invalid or missing bearer token');
        return;
    }

    // Extract debug session ID from URL
    const debugPath = req.url;
    const targetWsUrl = `${DEBUG_TARGET}${debugPath}`;

    console.log(`[${new Date().toISOString()}] WebSocket connection: ${debugPath}`);

    // Connect to actual debug target
    const targetWs = new WebSocket(targetWsUrl);

    targetWs.on('open', () => {
        console.log(`[${new Date().toISOString()}] Connected to target: ${targetWsUrl}`);
    });

    targetWs.on('message', (data) => {
        if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(data);
        }
    });

    targetWs.on('close', () => {
        console.log(`[${new Date().toISOString()}] Target connection closed`);
        clientWs.close();
    });

    targetWs.on('error', (err) => {
        console.error(`[${new Date().toISOString()}] Target error:`, err.message);
        clientWs.close(1011, 'Debug target connection error');
    });

    clientWs.on('message', (data) => {
        if (targetWs.readyState === WebSocket.OPEN) {
            targetWs.send(data);
        }
    });

    clientWs.on('close', () => {
        console.log(`[${new Date().toISOString()}] Client connection closed`);
        targetWs.close();
    });

    clientWs.on('error', (err) => {
        console.error(`[${new Date().toISOString()}] Client error:`, err.message);
        targetWs.close();
    });
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`[${new Date().toISOString()}] ERROR: Port ${PORT} is already in use`);
        console.error(`[${new Date().toISOString()}] Please choose a different port using DEBUG_PROXY_PORT environment variable`);
    } else if (err.code === 'EACCES') {
        console.error(`[${new Date().toISOString()}] ERROR: Permission denied to bind to port ${PORT}`);
        console.error(`[${new Date().toISOString()}] Ports below 1024 typically require elevated privileges`);
    } else {
        console.error(`[${new Date().toISOString()}] ERROR: Failed to start server:`, err.message);
    }
    process.exit(1);
});

server.listen(PORT, () => {
    console.log(`[${new Date().toISOString()}] Debug proxy listening on http://localhost:${PORT}`);
    console.log(`[${new Date().toISOString()}] Proxying to: ${DEBUG_TARGET}`);
    console.log(`[${new Date().toISOString()}] Authentication: Bearer token required`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log(`[${new Date().toISOString()}] SIGTERM received, shutting down...`);
    wss.close(() => {
        server.close(() => {
            console.log(`[${new Date().toISOString()}] Server closed`);
            process.exit(0);
        });
    });
});

process.on('SIGINT', () => {
    console.log(`[${new Date().toISOString()}] SIGINT received, shutting down...`);
    wss.close(() => {
        server.close(() => {
            console.log(`[${new Date().toISOString()}] Server closed`);
            process.exit(0);
        });
    });
});
