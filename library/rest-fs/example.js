/**
 * Example: Using rest-fs plugin with debug proxy
 */

const Hapi = require('@hapi/hapi');
const path = require('path');
const restFs = require('./index.js');

async function start() {
    const server = Hapi.server({
        port: 3000,
        host: 'localhost'
    });

    // Register the plugin
    await server.register({
        plugin: restFs,
        options: {
            baseDir: path.join(__dirname, 'example-data'),
            routePrefix: '/api/fs'
        }
    });

    await server.start();
    console.log('Server running on %s', server.info.uri);
    console.log('\nAvailable endpoints:');
    console.log('  GET  /api/fs/stat/{path}');
    console.log('  GET  /api/fs/readdir/{path}');
    console.log('  GET  /api/fs/read/{path}');
    console.log('  POST /api/fs/mkdir/{path}');
    console.log('  POST /api/fs/write/{path}');
    console.log('  POST /api/fs/rename');
    console.log('  POST /api/fs/copy');
    console.log('  DELETE /api/fs/delete/{path}');
    console.log('  POST /api/fs/debug-proxy/start');
    console.log('  GET  /api/fs/debug-proxy/status');

    console.log('\n--- Debug Proxy Usage Example ---');
    console.log('\n1. Start the debug proxy:');
    console.log(`
curl -X POST http://localhost:3000/api/fs/debug-proxy/start \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer my-secret-token-12345" \\
  -d '{
    "targetPort": 9229,
    "proxyPort": 9230
  }'
    `.trim());

    console.log('\n2. Get debug targets:');
    console.log(`
curl -H "Authorization: Bearer my-secret-token-12345" \\
  http://localhost:9230/json/list
    `.trim());

    console.log('\n3. Connect Chrome DevTools:');
    console.log('  - Open chrome://inspect');
    console.log('  - Configure: localhost:9230');
    console.log('  - Add header: Authorization: Bearer my-secret-token-12345');

    console.log('\n--- Filesystem Operations Example ---');
    console.log('\n1. Create a directory:');
    console.log('curl -X POST http://localhost:3000/api/fs/mkdir/test-dir');

    console.log('\n2. Write a file:');
    console.log('echo "Hello World" | curl -X POST http://localhost:3000/api/fs/write/test-dir/hello.txt --data-binary @-');

    console.log('\n3. Read the file:');
    console.log('curl http://localhost:3000/api/fs/read/test-dir/hello.txt');

    console.log('\n4. List directory:');
    console.log('curl http://localhost:3000/api/fs/readdir/test-dir');

    console.log('\n');
}

// Handle server shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    process.exit(0);
});

start().catch(console.error);
