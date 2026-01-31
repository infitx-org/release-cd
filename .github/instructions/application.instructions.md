---
applyTo:
  - "app/**/*.js"
  - "app/**/*.mjs"
  - "app/**/*.test.js"
description: Coding standards and patterns for application packages
---

# Application Package Guidelines

These instructions apply to all code in the `app/` directory, which contains deployable applications.

## Module Format

- **Use ES Modules** (`.mjs` extension and `import`/`export` syntax)
- Modern Node.js v22+ syntax and features are allowed
- Configuration files should use `.mjs` extension

## Code Style

### Imports and Exports
```javascript
// Use named imports
import { match } from '@infitx/match';
import { decide } from '@infitx/decision';

// Use default export for main entry
export default function handler(req, res) {
  // implementation
}

// Named exports for utilities
export { validateInput, processRequest };
```

### Async/Await
- Prefer async/await over Promises and callbacks
- Always handle errors in async functions

```javascript
async function fetchData(url) {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error('Fetch failed:', error);
    throw error;
  }
}
```

## Configuration

### Using rc Module
Applications use the `rc` module for hierarchical configuration:

```javascript
import rc from 'rc';

const config = rc('appname', {
  // defaults
  port: 3000,
  host: '0.0.0.0'
});
```

Configuration sources (in order of precedence):
1. Command line arguments
2. Environment variables (prefixed with appname_)
3. `.appnamerc` files (JSON or INI format)
4. Default values

### Environment Variables
- Use UPPER_SNAKE_CASE for environment variables
- Never commit `.env` files
- Document all environment variables in README

## Error Handling

### HTTP Errors
Use `@hapi/boom` for HTTP errors:

```javascript
import Boom from '@hapi/boom';

if (!isAuthorized) {
  throw Boom.unauthorized('Invalid credentials');
}

if (!found) {
  throw Boom.notFound('Resource not found');
}
```

### Logging
- Log errors with context (timestamp, request details)
- Use console.error for errors, console.log for info
- Consider structured logging for production

```javascript
console.error({
  timestamp: new Date().toISOString(),
  path: req.path,
  error: error.message,
  stack: error.stack
});
```

## Testing

- Use Jest with ES Module support
- Mock external services (Kubernetes, GitHub, Slack)
- Test HTTP endpoints with supertest or similar
- Use Allure for test reporting (already configured)

## Security

### Secret Management
- **NEVER** commit secrets or API keys
- Use environment variables for sensitive data
- Use Kubernetes secrets in production

### API Security
- Require authentication for sensitive endpoints
- Validate and sanitize all inputs
- Use HTTPS for external communications

### Example Authorization
```javascript
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (auth !== process.env.AUTHORIZATION) {
    throw Boom.unauthorized('Missing or invalid authorization');
  }
  next();
}
```

## Integration Patterns

### Kubernetes Client
```javascript
import k8s from '@kubernetes/client-node';

const kc = new k8s.KubeConfig();
kc.loadFromCluster(); // or kc.loadFromDefault()

const api = kc.makeApiClient(k8s.CoreV1Api);
```

### GitHub API
```javascript
import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});
```

### Slack Webhooks
```javascript
import { IncomingWebhook } from '@slack/webhook';

const webhook = new IncomingWebhook(process.env.SLACK_WEBHOOK);
await webhook.send({ text: 'Message' });
```

## Package Structure

```
app/package-name/
├── src/
│   ├── index.mjs      # Main entry point
│   ├── config.mjs     # Configuration
│   ├── routes/        # HTTP routes
│   ├── services/      # Business logic
│   └── *.test.js      # Tests colocated with source
├── package.json
└── README.md
```

## Current Applications

- **@infitx/release**: Release orchestration, testing, monitoring
- **@infitx/onboard**: Automated DFSP/FXP onboarding

When modifying applications, ensure backward compatibility for deployed instances.
