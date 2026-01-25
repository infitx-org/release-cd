# AI Coding Agent Instructions - Release CD

## Repository Overview

This is a **Rush monorepo** for release automation and onboarding tooling used in Mojaloop/COMESA environments. It contains 4 packages organized into applications and shared libraries.

### Package Structure

**Applications** (`app/`):

- `@infitx/release` (v1.31.3): Release orchestration service with test execution, Kubernetes integration, and Slack notifications
- `@infitx/onboard` (v1.1.2): Automated DFSP/FXP onboarding via Keycloak and Kubernetes

**Libraries** (`library/`):

- `@infitx/match` (v1.1.1): Object pattern matching utility with support for nested structures, arrays, and type coercion
- `@infitx/decision` (v1.2.0): Rule engine for evaluating facts against YAML-configured rules, depends on `@infitx/match`
- `@infitx/rest-fs` (v1.0.0): Rest filesystem plugin

### Technology Stack

- **Build system**: Rush 5.164.0 with pnpm 10.26.1
- **Node.js**: Requires v22 or v24 (see `rush.json:nodeSupportedVersionRange`)
- **Testing**: Jest 30.2.0 with jest-junit for CI integration
- **Package linking**: Workspace protocol (`workspace:*`) for internal dependencies

## Essential Developer Workflows

### Initial Setup

```bash
# Install Rush globally (optional, can use common/scripts/install-run-rush.js)
npm install -g @microsoft/rush

# Install all dependencies across monorepo
rush update

# Build all packages (respects dependency order)
rush build
```

### Development Commands

```bash
# Rebuild only changed packages and their dependents
rush rebuild

# Run tests in a specific package
cd library/match
npm run ci-unit  # CI mode with JUnit XML output
npm run watch    # Watch mode for TDD

# Check for uncommitted changes
rush check

# Add a new package (manual - update rush.json)
# Then run:
rush update
```

### Testing Patterns

**Unit tests**: All libraries use Jest with coverage reporting

- Test files: `*.test.js` colocated with source
- Coverage output: `./coverage/` directory
- JUnit XML: `./coverage/junit.xml` for CI integration

**Application tests**: `@infitx/release` uses Jest with Allure reporting

```bash
cd app/release
npm test              # Run tests + generate Allure report
npm run generate-report  # Regenerate Allure from existing results
npm run policy-report    # Policy compliance testing
npm run vulnerability-report  # Security scanning
npm run kubescape-report     # Kubernetes security scan
```

### Package Dependencies

**Workspace references**: Use `workspace:*` in package.json for internal dependencies

```json
{
    "dependencies": {
        "@infitx/match": "workspace:*",
        "@infitx/decision": "workspace:*"
    }
}
```

Rush resolves these to local symlinks during `rush update`. Changing a library automatically affects dependent packages.

### Running the Release Service Locally

```bash
cd app/release

# Standard mode
npm run release-cd

# Debug mode with Node inspector (port 9229)
NODE_WATCH_INSPECT=1 npm run release-cd

# Environment variables (see src/config.mjs)
# - SERVER_PORT: HTTP port (default: 3000)
# - SERVER_HOST: Bind address (default: 0.0.0.0)
# - AUTHORIZATION: Auth header value for API endpoints
# - GITHUB_TOKEN: GitHub API access
# - SLACK_WEBHOOK: Slack notifications
# - KUBECONFIG: Kubernetes config path (or use in-cluster auth)
```

**Key API endpoints**:

- `POST /keyRotate/{key}`: Rotate Vault/Kubernetes secrets
- `POST /keyRotateDFSP/{key}`: DFSP-specific key rotation
- `POST /triggerCronJob/{namespace}/{job}`: Trigger Kubernetes CronJobs
- `POST /notify`: Send Slack notifications
- `POST /reonboard`: Re-run DFSP onboarding
- `GET /cd/revision`: Get current CD revision info
- `GET /health`: Health check (no auth required)

## Package-Specific Patterns

### @infitx/match

**Purpose**: Flexible pattern matching for objects, arrays, and primitives

**Key features**:

- Partial matching: `{ a: 1 }` matches `{ a: 1, b: 2 }`
- Type coercion: String `"123"` matches number `123` with `coerceTypes: true`
- Range matching: `{ age: { min: 18, max: 65 } }`
- Array strategies: `exact`, `includes`, `partial`, `superset`, `subset`
- Nested structure matching with recursive comparison

**Usage example**:

```javascript
const match = require('@infitx/match');

// Basic matching
match({ a: 1 }, { a: 1, b: 2 }); // true (partial match)

// With options
match({ age: { min: 18 } }, { age: 25 }, { compareStrategy: 'partial' }); // true
```

### @infitx/decision

**Purpose**: Rule engine for decision-making based on YAML configurations

**Key features**:

- Priority-based rule evaluation (explicit or implicit)
- Pattern matching via `@infitx/match` in `when` clauses
- Multiple decision strategies: first match or all matches
- YAML-defined rules for maintainability

**Usage example**:

```javascript
const decision = require('@infitx/decision');
const { decide, rules } = decision('./rules.yaml');

const fact = { type: 'transfer', amount: 500 };
const result = decide(fact); // Returns matching rule's 'then' clause

// Get all configured rules
console.log(rules());
```

**YAML structure**:

```yaml
rules:
    rule-name:
        priority: 10 # Optional, higher = evaluated first
        when: { type: transfer, amount: { max: 1000 } }
        then: { approved: true, reason: 'Within limit' }
```

### @infitx/onboard

**Purpose**: Automate DFSP/FXP onboarding in Kubernetes environments

**Key operations**:

1. Fetches secrets from Keycloak
2. Creates Kubernetes Secrets and PushSecrets
3. Generates CSRs for proxy configurations
4. Interacts with MCM API for certificate signing
5. Triggers onboarding workflows

**Configuration** (via `rc` module):

- `keycloak.baseUrl`: Keycloak server (default: from `keycloak-admin-vs` VirtualService)
- `keycloak.username/password`: Auth credentials (default: from `switch-keycloak-initial-admin` secret)
- `http.auth`: Authorization header for `/secrets` endpoint
- `k8s.loadFromCluster`: Use in-cluster Kubernetes config

### @infitx/release

**Purpose**: Release orchestration with testing, monitoring, and notifications

**Key integrations**:

- **Kubernetes**: `@kubernetes/client-node` for K8s API interactions
- **GitHub**: `@octokit/rest` for releases and repository operations
- **Slack**: `@slack/webhook` for notifications
- **Testing**: Jest with Allure reporting
- **AWS**: S3 integration via `aws-sdk`
- **MongoDB**: Test data persistence

**Testing types**:

- Portal tests: UI/integration testing
- Policy reports: Compliance validation
- Vulnerability reports: Security scanning (Grype)
- Kubescape reports: Kubernetes security posture

## Project Conventions

### File Naming

- Test files: `*.test.js` (Jest discovers automatically)
- Config files: `config.mjs` or YAML for rule definitions
- Entry points: `index.js` or `index.mjs` (ES modules)

### Code Style

- **ES Modules**: Use `.mjs` extension and `import`/`export` syntax in apps
- **CommonJS**: Use `.js` and `require()` in libraries for broader compatibility
- **Type safety**: No TypeScript, but leverage JSDoc comments for editor hints

### Configuration Management

- Use `rc` module for hierarchical config: `.${appname}rc`, environment variables, CLI args
- Config files: YAML for readability, JSON for data structures
- Secrets: Never commit secrets; use environment variables or Kubernetes secrets

### Error Handling

- Use `@hapi/boom` for HTTP errors in apps
- Libraries throw standard Error objects
- Log errors with context (timestamp, request path, error details)

### Testing Best Practices

- **Arrange-Act-Assert** pattern in tests
- Use descriptive test names: `it('should return true when amount is under limit', ...)`
- Mock external dependencies (Kubernetes API, GitHub, Slack)
- Aim for high coverage on libraries (utilities), pragmatic coverage on apps

## Common Development Tasks

### Adding a New Package

1. Create directory: `app/<name>` or `library/<name>`
2. Initialize: `npm init` and set up package.json
3. Add to `rush.json`:

```json
{
    "packageName": "@infitx/new-package",
    "projectFolder": "library/new-package"
}
```

4. Run: `rush update` to register the package

### Creating a Workspace Dependency

In dependent package's `package.json`:

```json
{
    "dependencies": {
        "@infitx/match": "workspace:*"
    }
}
```

Then: `rush update` to create symlinks

### Debugging Test Failures

```bash
# Run tests with verbose output
cd library/match
npm run ci-unit -- --verbose

# Run specific test file
npm run ci-unit -- path/to/test.test.js

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Release Process

This repo uses **release-please** (see `.release-please-manifest.json` and `release-please-config.json`):

- PRs trigger version bump detection
- Merge to main creates release PR
- Merging release PR creates GitHub release and tags

**Manual version bumps**: Edit CHANGELOG.md following conventional commits

## Common Pitfalls

1. **Rush update vs npm install**: Always use `rush update` at repo root, never `npm install` in individual packages (breaks workspace linking)

2. **Node version mismatch**: Check `rush.json:nodeSupportedVersionRange`. Use nvm: `nvm use` (reads `.nvmrc`)

3. **Workspace dependencies not resolving**: Run `rush update` after adding `workspace:*` dependencies

4. **Build order issues**: Rush automatically determines build order from dependencies. If build fails, ensure `package.json` dependencies are correct

5. **Test isolation**: Jest runs tests in parallel by default. Use `--runInBand` if tests interfere with each other

6. **Port conflicts**: Release service defaults to port 3000. Override with `SERVER_PORT` env var

## Key File Locations

### Configuration

- `rush.json`: Rush configuration, package inventory, Node version requirements
- `.nvmrc`: Node version for nvm
- `common/config/rush/`: Rush-specific configs (not currently used)
- `app/release/src/config.mjs`: Release service configuration with defaults

### CI/CD

- `.github/workflows/build.yaml`: PR validation workflow
- `.github/workflows/release.yaml`: Release automation via release-please
- `release-please-config.json`: Release-please configuration
- `.release-please-manifest.json`: Current version tracking

### Testing

- `library/*/test/`: Test files for libraries
- `app/release/src/`: Tests colocated with source for release app
- `.allure/`: Allure report configuration

### Documentation

- `library/match/README.md`: Match library API documentation
- `library/decision/README.md`: Decision engine guide with examples
- `app/onboard/README.md`: Onboarding service configuration reference
- `CHANGELOG.md` files: Version history per package

## When Modifying Code

- **Before committing**: Run `rush build` to ensure all packages compile
- **After dependency changes**: Run `rush update` to update lock files
- **Before pushing**: Ensure tests pass with `npm run ci-unit` in changed packages
- **Commit messages**: Follow conventional commits (feat:, fix:, docs:) for release-please integration
- **Breaking changes**: Add `BREAKING CHANGE:` footer to commit message for major version bumps
