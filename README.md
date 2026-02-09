# Release CD - Mojaloop Release Automation & Onboarding

A **Rush monorepo** containing release orchestration, automated onboarding tooling, and reusable libraries for Mojaloop/COMESA deployment environments.

## 🎯 Overview

This repository provides critical infrastructure automation for:

- **Release Management**: Automated testing, deployment validation, and reporting
- **DFSP/FXP Onboarding**: Streamlined onboarding workflows with Keycloak and Kubernetes integration
- **Pattern Matching & Decision Logic**: Reusable libraries for rule-based evaluation and flexible object comparison

## 📦 Package Structure

The monorepo contains **5 packages** organized into applications and shared libraries:

### Applications (`app/`)

| Package | Version | Description |
|---------|---------|-------------|
| [`@infitx/release`](app/release/) | 1.45.2 | Release orchestration service with test execution, Kubernetes integration, and reporting |
| [`@infitx/onboard`](app/onboard/) | 1.3.1 | Automated DFSP/FXP onboarding via Keycloak and Kubernetes |

### Libraries (`library/`)

| Package | Version | Description |
|---------|---------|-------------|
| [`@infitx/match`](library/match/) | 1.2.1 | Flexible pattern matching for objects, arrays, and nested structures |
| [`@infitx/decision`](library/decision/) | 1.2.0 | YAML-based rule engine for decision-making workflows |
| [`@infitx/rest-fs`](library/rest-fs/) | 1.2.0 | REST filesystem plugin with Node.js debug proxy support |

## ✨ Key Features

### Release Service (`@infitx/release`)

- **Automated Testing**: Portal tests, E2E validation, policy compliance
- **Security Scanning**: Vulnerability reports (Grype), Kubescape security posture analysis
- **Kubernetes Integration**: CronJob triggering, secret rotation, deployment monitoring
- **Reporting**: Allure test reports with Slack notifications
- **CI/CD Integration**: GitHub release management, deployment tracking
- **Secret Management**: Automated key rotation for Vault and Kubernetes secrets
- **REST API**: HTTP endpoints for onboarding, testing, and monitoring operations

#### Key Endpoints

```
POST   /keyRotate/{key}                 # Rotate Vault/K8s secrets
POST   /keyRotateDFSP/{key}             # DFSP-specific key rotation
POST   /triggerCronJob/{namespace}/{job} # Trigger K8s CronJobs
POST   /notify                          # Send Slack notifications
POST   /reonboard/{key?}                # Re-run DFSP onboarding
GET    /dfsp/{id}/state                # Get DFSP state
GET    /cd/revision                     # Get CD revision info
GET    /health                          # Health check
GET    /report/{key*}                   # View test reports
```

### Onboarding Service (`@infitx/onboard`)

- **Secrets Orchestration**: Fetch and distribute secrets across environments
- **Certificate Management**: CSR generation and signing via MCM API
- **Keycloak Integration**: Automated client creation and role assignment
- **Multi-Environment Support**: Regional and emulated environment coordination
- **Kubernetes Native**: Secrets, PushSecrets, and VirtualService management

### Match Library (`@infitx/match`)

```javascript
const match = require('@infitx/match');

// Partial object matching
match({ a: 1, b: 2 }, { a: 1 }); // true

// Array "any-of" semantics
match('active', ['active', 'pending', 'processing']); // true

// Nested structure matching
match(
  { user: { name: 'Alice', age: 30 } },
  { user: { name: 'Alice' } }
); // true

// Type coercion
match("123", 123, { coerceTypes: true }); // true

// Range matching
match({ age: 25 }, { age: { min: 18, max: 65 } }); // true
```

### Decision Library (`@infitx/decision`)

```javascript
const decision = require('@infitx/decision');
const { decide } = decision('./rules.yaml');

const fact = { type: 'transfer', amount: 500 };
const result = decide(fact);
```

**Sample YAML Configuration:**

```yaml
rules:
  transfer-approval:
    when: { type: transfer, amount: { max: 1000 } }
    then: { approved: true, reason: within-limit }

  transfer-rejection:
    when: { type: transfer, amount: { min: 1001 } }
    then: { approved: false, reason: exceeds-limit }
```

## 🛠 Technology Stack

- **Build System**: Rush 5.166.0 with pnpm 10.28.1
- **Node.js**: v22 or v24 (see `.nvmrc`)
- **Testing**: Jest 30.2.0 with Allure reporting
- **Web Framework**: Hapi.js 21.4.4
- **Kubernetes**: `@kubernetes/client-node` 1.4.0
- **GitHub Integration**: `@octokit/rest` 21.1.1
- **Notifications**: `@slack/webhook` 7.0.6
- **Security**: Grype, Kubescape, Kyverno
- **Databases**: MongoDB 7.0.0, MySQL2 3.16.0
- **Release Management**: release-please (automated versioning)

## 🚀 Quick Start

### Prerequisites

- Node.js v22 or v24 (use `nvm use` to switch)
- Rush CLI (optional, scripts provided in `common/scripts/`)

### Installation

```bash
# Install dependencies across all packages
./common/scripts/install-run-rush.js update

# Build all packages (respects dependency order)
./common/scripts/install-run-rush.js build

# Or if Rush is installed globally
rush update
rush build
```

### Running the Release Service

```bash
cd app/release

# Standard mode
npm run release-cd

# Debug mode with Node inspector
NODE_WATCH_INSPECT=1 npm run release-cd

# Run tests
npm test
```

### Running the Onboarding Service

```bash
cd app/onboard

# View configuration options
cat README.md

# Service runs in Kubernetes (see onboarding.Dockerfile)
```

### Running Tests

```bash
# Test a specific library
cd library/match
npm run ci-unit

# Watch mode for TDD
npm run watch

# Test all libraries
rush test
```

## 📐 Project Structure

```
release-cd/
├── app/                          # Application packages
│   ├── release/                  # Release orchestration service
│   │   ├── src/
│   │   │   ├── handler/          # HTTP route handlers
│   │   │   ├── apiClients/       # External API integrations
│   │   │   ├── report/           # Security and compliance reports
│   │   │   └── fn/               # Utility functions
│   │   └── test/                 # Jest tests with Allure
│   └── onboard/                  # Onboarding automation
│       └── index.js              # Keycloak & K8s orchestration
│
├── library/                      # Shared libraries
│   ├── match/                    # Pattern matching utility
│   ├── decision/                 # Rule engine
│   └── rest-fs/                  # REST filesystem plugin
│
├── common/                       # Rush shared configuration
│   ├── config/rush/              # Rush config files
│   └── scripts/                  # Installation scripts
│
├── .github/
│   ├── workflows/                # CI/CD pipelines
│   │   ├── build.yaml            # PR validation
│   │   └── release.yaml          # Automated releases
│   └── instructions/             # AI coding agent docs
│
├── rush.json                     # Rush configuration
├── release-please-config.json    # Release automation
└── .release-please-manifest.json # Version tracking
```

## 🔄 Development Workflows

### Making Changes

```bash
# 1. Install dependencies after pulling changes
rush update

# 2. Make changes to packages

# 3. Build changed packages and dependents
rush rebuild

# 4. Run tests
cd <package-directory>
npm test

# 5. Commit with conventional commits
git commit -m "feat: add new feature"
git commit -m "fix: resolve bug"
git commit -m "docs: update README"
```

### Adding Dependencies

```bash
# For workspace dependencies, edit package.json:
{
  "dependencies": {
    "@infitx/match": "workspace:*"
  }
}

# Then run:
rush update
```

### Creating a New Package

1. Create directory in `app/` or `library/`
2. Initialize with `npm init`
3. Add to `rush.json`:

```json
{
  "packageName": "@infitx/new-package",
  "projectFolder": "library/new-package"
}
```

1. Run `rush update` to register the package

## 📊 Testing & Reporting

### Test Types

- **Unit Tests**: Jest with coverage reporting (all libraries)
- **Portal Tests**: UI/integration testing (release service)
- **E2E Tests**: End-to-end workflow validation
- **Security Scans**:
  - Vulnerability scanning with Grype
  - Kubernetes security posture with Kubescape
  - Policy compliance validation

### Running Reports

```bash
cd app/release

# Generate policy compliance report
npm run policy-report

# Generate vulnerability report
npm run vulnerability-report

# Generate Kubescape security report
npm run kubescape-report

# All reports generate Allure output and send Slack notifications
```

## 🔐 Security & Compliance

- **Secret Management**: Vault integration with automated rotation
- **RBAC**: Kubernetes service accounts with least-privilege access
- **Vulnerability Scanning**: Automated Grype scans in CI/CD
- **Policy Enforcement**: Kyverno policies with compliance reporting
- **Security Posture**: Kubescape Kubernetes security assessments

## 🤝 CI/CD Integration

### GitHub Actions

- **Build Pipeline** (`.github/workflows/build.yaml`):
  - Triggered on PRs
  - Runs Rush build and tests
  - Validates all packages

- **Release Pipeline** (`.github/workflows/release.yaml`):
  - Automated with release-please
  - Creates release PRs on merge to main
  - Tags versions and publishes releases

### Release Process

This repo uses **release-please** for automated semantic versioning:

1. Make changes with conventional commits (`feat:`, `fix:`, `docs:`)
2. Merge PR to main
3. release-please creates a release PR
4. Merge release PR to publish new versions

## 📝 Configuration

### Release Service Configuration

Environment variables (see [`app/release/src/config.mjs`](app/release/src/config.mjs)):

```bash
SERVER_PORT=3000              # HTTP port
SERVER_HOST=0.0.0.0           # Bind address
AUTHORIZATION=secret-token    # API auth header
GITHUB_TOKEN=ghp_xxx          # GitHub API access
SLACK_WEBHOOK=https://...     # Slack notifications
KUBECONFIG=/path/to/config    # K8s config (or use in-cluster)
```

### Onboarding Service Configuration

Uses `rc` module for hierarchical config (see [`app/onboard/README.md`](app/onboard/README.md)):

- `.onboardrc` file
- Environment variables with `onboard_` prefix
- Command-line arguments

## 📖 Additional Documentation

- **Package READMEs**: Each package has detailed documentation
  - [Release Service](app/release/)
  - [Onboarding Service](app/onboard/README.md)
  - [Match Library](library/match/README.md)
  - [Decision Library](library/decision/README.md)
  - [REST-FS Library](library/rest-fs/README.md)

- **AI Coding Instructions**:
  - [Copilot Instructions](.github/copilot-instructions.md)
  - [Application Standards](.github/instructions/application.instructions.md)
  - [Library Standards](.github/instructions/library.instructions.md)
  - [Testing Standards](.github/instructions/testing.instructions.md)

## 🐛 Common Issues

### Node Version Mismatch

```bash
# Use nvm to switch to supported version
nvm use

# Or install required version
nvm install 24
```

### Rush Update Failures

```bash
# Clean Rush temporary files
rm -rf common/temp
rush update --purge
```

### Build Failures

```bash
# Rebuild with verbose output
rush rebuild --verbose

# Check build order
rush list
```

## 📜 License

See individual package `package.json` files for license information.

## 🔗 Related Repositories

This monorepo is part of the Mojaloop/COMESA deployment ecosystem:

- **iac-modules**: Infrastructure as Code modules
- **iac-ansible-collection-roles**: Ansible automation
- **iac-crossplane-packages**: Crossplane infrastructure packages
- **comesa-tests**: End-to-end test suites

## 👥 Contributing

1. Follow conventional commit format for all commits
2. Ensure tests pass before submitting PRs
3. Update relevant documentation
4. Run `rush build` to validate changes across all packages

For detailed development guidelines, see [`.github/copilot-instructions.md`](.github/copilot-instructions.md).

---

**Built with Rush** | Automated with release-please | Tested with Jest & Allure
