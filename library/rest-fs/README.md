# @infitx/rest-fs

REST filesystem plugin for Hapi.js with integrated Node.js debug proxy support.

## Features

- **Filesystem Operations**: Complete REST API for file and directory operations
- **Debug Proxy**: Secure proxy for Node.js debug protocol with bearer token authentication
- **Process Management**: Automatic child process cleanup when server stops
- **Path Security**: Built-in path traversal protection

## Installation

```bash
npm install @infitx/rest-fs
```

## Usage

### Basic Setup

```javascript
const Hapi = require('@hapi/hapi');
const restFs = require('@infitx/rest-fs');

const server = Hapi.server({
    port: 3000,
    host: 'localhost'
});

await server.register({
    plugin: restFs,
    options: {
        baseDir: path.join(__dirname, 'data'),
        routePrefix: '/api/fs',
        maxFileSize: 52428800 // 50MB default
    }
});

await server.start();
```

## API Endpoints

### Filesystem Operations

#### `GET /api/fs/stat/{path*}`

Get file or directory metadata.

**Response:**

```json
{
    "type": "file",
    "size": 1024,
    "mtime": 1640000000000,
    "ctime": 1640000000000
}
```

#### `GET /api/fs/readdir/{path*}`

List directory contents.

**Response:**

```json
[
    { "name": "file.txt", "type": "file" },
    { "name": "subdir", "type": "directory" }
]
```

#### `POST /api/fs/mkdir/{path*}`

Create a directory (recursive).

**Response:**

```json
{ "success": true }
```

#### `GET /api/fs/read/{path*}`

Read file contents as binary stream.

#### `POST /api/fs/write/{path*}`

Write file contents.

**Headers:**

- `Content-Type: application/octet-stream`

**Body:** File contents (binary)

#### `POST /api/fs/rename`

Rename or move a file/directory.

**Payload:**

```json
{
    "oldPath": "old-name.txt",
    "newPath": "new-name.txt"
}
```

#### `POST /api/fs/copy`

Copy a file or directory.

**Payload:**

```json
{
    "source": "source-file.txt",
    "destination": "dest-file.txt"
}
```

#### `DELETE /api/fs/delete/{path*}?recursive=true`

Delete a file or directory.

**Query Parameters:**

- `recursive`: Set to `true` to delete directories recursively

### Debug Proxy Operations

The debug proxy provides a secure way to access Node.js debug protocol over the network with bearer token authentication.

#### `POST /api/fs/debug-proxy/start`

Start the debug proxy child process.

**Headers:**

- `Authorization: Bearer <token>` (required)

**Payload:**

```json
{
    "targetPort": 9229,
    "proxyPort": 9230
}
```

**Response:**

```json
{
    "status": "started",
    "port": 9230,
    "message": "Debug proxy started successfully"
}
```

#### `GET /api/fs/debug-proxy/status`

Get debug proxy status.

**Response:**

```json
{
    "running": true,
    "port": 9230,
    "pid": 12345
}
```

### Debug Proxy Usage

Once the debug proxy is running, you can connect to it using Chrome DevTools or any other debugger:

1. Start the proxy via the API
2. Access debug targets at `http://localhost:9230/json/list` with bearer token
3. Connect to WebSocket endpoint with authentication

**Example with curl:**

```bash
# Get debug targets
curl -H "Authorization: Bearer your-bearer-token" \
    http://localhost:9230/json/list

# Response will include WebSocket URLs for debugging
```

**Authentication:**
All debug proxy requests require the `Authorization: Bearer <token>` header.

## Debug Proxy Architecture

The debug proxy is implemented as a child process that:

1. **Auto-spawns on demand**: Created when first requested
2. **Runs once**: Won't spawn multiple instances
3. **Auto-terminates**: Cleans up when parent process ends
4. **Secured**: Requires bearer token for all operations
5. **Proxies both protocols**: HTTP endpoints and WebSocket connections

### Debug Proxy Features

- **HTTP Endpoints**: Proxies `/json`, `/json/list`, and other debug endpoints
- **WebSocket Proxy**: Full-duplex proxying of debug protocol
- **URL Rewriting**: Automatically rewrites URLs to point to proxy
- **CORS Support**: Built-in CORS headers for browser access
- **Error Handling**: Graceful handling of connection errors

## Security

- **Path Traversal Protection**: Prevents access outside base directory
- **Bearer Token Authentication**: Required for debug proxy access
- **Process Isolation**: Debug proxy runs as separate child process
- **Automatic Cleanup**: Child processes terminate with parent

## Testing

```bash
npm test              # Run tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage
```

Tests use Jest with snapshots and include:

- Complete filesystem operation coverage
- Debug proxy lifecycle management
- Authentication verification
- Process cleanup validation
- Security tests

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseDir` | string | `process.cwd() + '/data'` | Base directory for filesystem operations |
| `routePrefix` | string | `/api/fs` | URL prefix for all routes |
| `maxFileSize` | number | `52428800` (50MB) | Maximum file upload size |
| `options` | object | `{}` | Additional Hapi route options (auth, etc.) |

## Advanced Usage

### With Authentication

```javascript
await server.register({
    plugin: restFs,
    options: {
        baseDir: '/var/data',
        routePrefix: '/api/fs',
        options: {
            auth: 'jwt' // Apply auth strategy to all routes
        }
    }
});
```

### Programmatic Debug Proxy Control

The debug proxy endpoints allow you to control debugging remotely:

```javascript
// Start proxy with specific token
const response = await fetch('http://localhost:3000/api/fs/debug-proxy/start', {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${crypto.randomBytes(32).toString('hex')}`
    },
    body: JSON.stringify({
        targetPort: 9229,
        proxyPort: 9230
    })
});

// Check status
const status = await fetch('http://localhost:3000/api/fs/debug-proxy/status');
console.log(await status.json());
```

## Environment Variables (Debug Proxy Child Process)

The child process uses these environment variables (set automatically by parent):

- `DEBUG_PROXY_TOKEN`: Bearer token for authentication
- `DEBUG_TARGET`: Target WebSocket URL (e.g., `ws://localhost:9229`)
- `DEBUG_PROXY_PORT`: Port to listen on

## License

Apache-2.0

## Author

Kalin Krustev
