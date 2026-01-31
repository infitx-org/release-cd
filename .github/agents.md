# GitHub Copilot Custom Agents

This repository uses specialized GitHub Copilot agents to help with different aspects of development. Each agent has specific expertise and tools to handle particular tasks effectively.

## Available Agents

### Test Engineer (@test_engineer)
**Purpose**: Create, maintain, and run Jest unit tests across the monorepo

**When to use**:
- Writing new unit tests
- Fixing failing tests
- Improving test coverage
- Running test suites

**Key capabilities**:
- Jest 30.2.0 expertise
- Arrange-Act-Assert patterns
- Mocking external dependencies
- Coverage reporting

**Location**: `.github/agents/test-agent.md`

---

### Documentation Specialist (@documentation_specialist)
**Purpose**: Maintain clear and up-to-date documentation

**When to use**:
- Writing or updating README files
- Maintaining CHANGELOG files
- Documenting APIs and configuration
- Creating usage examples

**Key capabilities**:
- Technical writing
- Markdown formatting
- API documentation
- Code examples

**Location**: `.github/agents/docs-agent.md`

---

### Monorepo Specialist (@monorepo_specialist)
**Purpose**: Manage Rush monorepo operations and dependencies

**When to use**:
- Adding new packages to the monorepo
- Managing workspace dependencies
- Resolving build order issues
- Troubleshooting Rush-specific problems

**Key capabilities**:
- Rush configuration
- Workspace dependency management
- Build orchestration
- Package coordination

**Location**: `.github/agents/monorepo-agent.md`

---

### Security Specialist (@security_specialist)
**Purpose**: Identify and address security vulnerabilities

**When to use**:
- Running security scans
- Analyzing vulnerability reports
- Fixing security issues
- Reviewing code for security concerns

**Key capabilities**:
- Grype vulnerability scanning
- Kubescape Kubernetes security
- Secure coding practices
- Vulnerability assessment

**Location**: `.github/agents/security-agent.md`

---

## How to Use Custom Agents

### In GitHub Copilot Chat
You can invoke specific agents using the `@` mention syntax:

```
@test_engineer write unit tests for the match function
@documentation_specialist update the README for the decision package
@monorepo_specialist add a new package called @infitx/validator
@security_specialist run a security scan and report vulnerabilities
```

### Agent Selection
- Agents with `infer: true` can be automatically selected by Copilot based on context
- You can always explicitly select an agent using @ mentions
- Each agent has clear boundaries to prevent scope creep

## Agent Guidelines

### Best Practices
1. **Use specific agents for specialized tasks**: Each agent is optimized for particular workflows
2. **Provide context**: Give agents enough information about what you need
3. **Follow boundaries**: Agents are designed to work within specific scopes
4. **Combine agents**: Use multiple agents for complex tasks (e.g., test-agent + docs-agent)

### Agent Boundaries
All agents follow these rules:
- Never commit secrets or credentials
- Follow existing code patterns and conventions
- Respect the Rush monorepo structure
- Use conventional commits for all changes
- Always run `rush update` instead of `npm install`

## Repository Structure

```
release-cd/
├── .github/
│   ├── agents/               # Custom agent configurations
│   │   ├── test-agent.md
│   │   ├── docs-agent.md
│   │   ├── monorepo-agent.md
│   │   └── security-agent.md
│   └── copilot-instructions.md  # Repository-wide instructions
├── app/                      # Application packages
│   ├── release/
│   └── onboard/
└── library/                  # Shared library packages
    ├── match/
    ├── decision/
    └── rest-fs/
```

## Additional Resources

- **Repository Instructions**: `.github/copilot-instructions.md` - Comprehensive guide to the repository structure and workflows
- **Rush Documentation**: https://rushjs.io
- **GitHub Copilot Docs**: https://docs.github.com/en/copilot

## Feedback and Improvements

If you have suggestions for improving the agents or adding new specialized agents, please:
1. Review the existing agent configurations
2. Consider whether a new agent is needed or an existing one should be enhanced
3. Follow the YAML frontmatter + Markdown format for consistency
4. Test the agent behavior before committing changes
