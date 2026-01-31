# GitHub Copilot Configuration

This directory contains custom instructions and agent configurations for GitHub Copilot coding agent to work effectively with this Rush monorepo.

## Configuration Overview

This repository follows GitHub Copilot best practices with a three-tier instruction system:

### 1. Repository-Wide Instructions
**File**: `copilot-instructions.md`

Provides comprehensive context about:
- Rush monorepo structure and packages
- Technology stack (Rush 5.166.0, pnpm, Node.js 22/24, Jest)
- Development workflows and commands
- Package-specific patterns and usage
- Common pitfalls and solutions
- Key file locations

**When applied**: All Copilot interactions in the repository

### 2. Path-Specific Instructions
**Directory**: `instructions/`

Provides targeted guidance for specific code areas using glob patterns:

| File | Applies To | Purpose |
|------|-----------|---------|
| `library.instructions.md` | `library/**/*.js` | CommonJS patterns, JSDoc, library development |
| `application.instructions.md` | `app/**/*.{js,mjs}` | ES Modules, configuration, API integrations |
| `testing.instructions.md` | `**/*.test.js` | Jest patterns, mocking, Arrange-Act-Assert |

**When applied**: When editing files matching the `applyTo` glob patterns

### 3. Custom Agents
**Directory**: `agents/`

Specialized AI agents for specific development tasks:

| Agent | File | Purpose | Auto-Invoke |
|-------|------|---------|-------------|
| @test_engineer | `test-agent.md` | Create and maintain Jest tests | ✅ Yes |
| @documentation_specialist | `docs-agent.md` | Write and update documentation | ✅ Yes |
| @monorepo_specialist | `monorepo-agent.md` | Manage Rush monorepo operations | ✅ Yes |
| @security_specialist | `security-agent.md` | Security scanning and vulnerability fixes | ✅ Yes |

**Overview**: `agents.md` - Guide for using custom agents

**When applied**: Invoke with `@agent_name` in Copilot Chat, or auto-selected based on context

## How It Works

### Instruction Hierarchy

When you work on a file, Copilot combines instructions from multiple sources:

```
Repository-wide instructions (copilot-instructions.md)
    ↓
+ Path-specific instructions (if file matches applyTo pattern)
    ↓
+ Custom agent instructions (if agent is invoked or auto-selected)
    ↓
= Complete context for Copilot
```

**Example**: Editing `library/match/test/match.test.js`
- Repository-wide: General monorepo guidance
- Path-specific: `testing.instructions.md` (Jest patterns)
- Path-specific: `library.instructions.md` (library patterns)
- Agent: `@test_engineer` (if invoked or auto-selected)

### Custom Agent Usage

Agents can be invoked explicitly or selected automatically:

```
# Explicit invocation in Copilot Chat
@test_engineer write tests for the match function
@documentation_specialist update the README with new API
@monorepo_specialist add a new library package
@security_specialist run vulnerability scan

# Automatic selection (infer: true)
# Copilot selects appropriate agent based on:
# - File patterns being edited
# - Task description in prompt
# - Context from conversation
```

## Configuration Details

### Agent Configuration Format

Each agent file uses YAML frontmatter + Markdown content:

```yaml
---
name: agent_name                # Unique identifier
description: Brief description  # What the agent does
tools: ["bash", "edit", "view"] # Available tools (optional)
infer: true                     # Allow auto-selection
metadata:                       # Additional metadata
  type: category
  version: 1.0
---

# Agent Instructions

Markdown content with:
- Responsibilities
- Commands to run
- Code examples
- Boundaries (what NOT to do)
- Package-specific guidance
```

### Path-Specific Instruction Format

Each instruction file targets specific paths:

```yaml
---
applyTo:
  - "path/pattern/**/*.js"      # Glob patterns
  - "another/pattern/**/*.ts"
description: Brief description  # What these instructions cover
---

# Instructions Content

Markdown with:
- Code style guidelines
- Framework patterns
- Best practices
- Examples
```

## Repository Structure

```
.github/
├── agents/                           # Custom agent configurations
│   ├── test-agent.md                # Test engineering agent
│   ├── docs-agent.md                # Documentation agent
│   ├── monorepo-agent.md            # Monorepo operations agent
│   └── security-agent.md            # Security scanning agent
├── instructions/                     # Path-specific instructions
│   ├── library.instructions.md      # For library/ code
│   ├── application.instructions.md  # For app/ code
│   └── testing.instructions.md      # For *.test.js files
├── agents.md                        # Agent overview and guide
├── copilot-instructions.md          # Repository-wide instructions
└── README.md                        # This file
```

## Benefits

### For Developers
- **Consistent guidance**: Same standards across all AI interactions
- **Context-aware help**: Different guidance for libraries vs applications
- **Specialized assistance**: Expert agents for testing, docs, security, etc.
- **Reduced onboarding**: Comprehensive repository knowledge embedded

### For Code Quality
- **Enforced patterns**: CommonJS for libraries, ES Modules for apps
- **Testing standards**: Jest patterns, mocking, Arrange-Act-Assert
- **Security**: Automated vulnerability awareness
- **Documentation**: Consistent docs across packages

### For Efficiency
- **Faster development**: Copilot understands Rush monorepo structure
- **Better suggestions**: Context from package.json, rush.json, existing code
- **Reduced errors**: Knows common pitfalls and how to avoid them
- **Task delegation**: Specialized agents handle specific workflows

## Best Practices

### When to Use Custom Agents

✅ **Use custom agents for**:
- Writing or fixing tests (`@test_engineer`)
- Creating or updating docs (`@documentation_specialist`)
- Adding packages or managing dependencies (`@monorepo_specialist`)
- Security scans or vulnerability fixes (`@security_specialist`)

✅ **Use general Copilot for**:
- Quick code edits
- Refactoring existing code
- Debugging specific issues
- Exploratory coding

### Maintaining Instructions

**Keep instructions up-to-date**:
- Update when tech stack changes
- Add new patterns as they emerge
- Remove outdated guidance
- Include lessons learned from issues

**Test effectiveness**:
- Verify Copilot follows guidelines
- Adjust wording if misunderstood
- Add examples for clarity
- Remove conflicting instructions

## Examples

### Example 1: Adding a New Library Package

```
Developer: @monorepo_specialist add a new library package called @infitx/validator

Agent: I'll help you add a new library package to the Rush monorepo.
[Creates directory structure]
[Updates rush.json]
[Sets up package.json with proper scripts]
[Runs rush update]
```

### Example 2: Writing Tests

```
Developer: @test_engineer write tests for the match function in library/match

Agent: I'll create comprehensive Jest tests following the Arrange-Act-Assert pattern.
[Creates test file]
[Adds describe blocks and test cases]
[Includes mocking examples]
[Follows testing.instructions.md patterns]
```

### Example 3: Security Scan

```
Developer: @security_specialist run a security scan on the release app

Agent: I'll run the configured security scans.
[Runs npm run vulnerability-report]
[Runs npm run kubescape-report]
[Analyzes results]
[Provides severity-sorted findings]
```

## Troubleshooting

### Copilot Not Following Instructions

1. **Check instruction clarity**: Ensure instructions are specific and unambiguous
2. **Verify file patterns**: Confirm `applyTo` patterns match your files
3. **Check for conflicts**: Multiple instructions might contradict each other
4. **Use explicit agents**: Invoke specific agents with `@agent_name`

### Agent Not Auto-Selecting

1. **Verify `infer: true`** in agent frontmatter
2. **Be specific in prompts**: Mention keywords related to agent's domain
3. **Explicitly invoke**: Use `@agent_name` syntax

### Instructions Not Updating

1. **Reload VS Code**: Changes may require IDE reload
2. **Check file location**: Files must be in `.github/` directory
3. **Verify YAML syntax**: Frontmatter must be valid YAML

## Contributing

When updating Copilot configuration:

1. **Test changes**: Verify Copilot behavior matches expectations
2. **Document updates**: Update this README if adding new agents or instructions
3. **Keep consistent**: Follow existing patterns for formatting and structure
4. **Get feedback**: Ask team members if new instructions are helpful

## Resources

- [GitHub Copilot Custom Instructions Documentation](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions)
- [Custom Agents Configuration](https://docs.github.com/en/copilot/reference/custom-agents-configuration)
- [Best Practices for Copilot Coding Agent](https://github.blog/ai-and-ml/github-copilot/onboarding-your-ai-peer-programmer-setting-up-github-copilot-coding-agent-for-success/)
- [How to Write a Great agents.md](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/)
