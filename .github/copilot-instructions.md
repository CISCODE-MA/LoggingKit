# Copilot Instructions – @ciscode/logging-kit

> **Purpose**: Project-specific instructions for contributing to @ciscode/logging-kit, a modular TypeScript logging library for Node.js/NestJS, with best practices, standardized structure, and AI-friendly development workflow.

---

## 🎯 Project Overview

- **Package**: @ciscode/logging-kit (see package.json)
- **Type**: TypeScript logging library for Node.js/NestJS
- **Purpose**: Provide robust, flexible, and secure logging for applications and frameworks

### This Project Provides:

- Modular architecture: `core/`, `infra/`, `nest/`, `test/`
- Complete TypeScript configuration with path aliases
- Jest testing setup with 80% coverage threshold
- Changesets for version management
- Husky + lint-staged for code quality
- CI/CD workflows
- Copilot-friendly development guidelines

---

## 🏗️ Project Architecture

**LoggingKit uses a modular, layered structure for flexibility and maintainability.**

```
src/
  index.ts                    # PUBLIC API exports
  core/                       # Core logging logic (config, masking, error parsing, etc)
    config.ts, correlation.ts, error-parser.ts, masking.ts, sampling.ts, types.ts, index.ts
  infra/                      # Logger factories, transports, adapters
    logger.factory.ts, transports.ts, index.ts
  nest/                       # NestJS integration (module, service, interceptor, decorators, etc)
    constants.ts, decorators.ts, interceptor.ts, module.ts, service.ts, index.ts
test/
  *.test.ts                   # All tests live here
```

**Responsibility Layers:**

| Layer      | Responsibility                       | Examples                        |
| ---------- | ------------------------------------ | ------------------------------- |
| **core/**  | Logging logic, config, masking, etc. | `masking.ts`, `error-parser.ts` |
| **infra/** | Logger factories, transports         | `logger.factory.ts`             |
| **nest/**  | NestJS integration (module, service) | `module.ts`, `service.ts`       |
| **test/**  | All tests                            | `logger.test.ts`                |

**Module Exports (Public API):**

```typescript
// src/index.ts - Only export what consumers need
export * from "./core";
export * from "./nest";
export { createLogger } from "./infra/logger.factory";
// ❌ NEVER export internal helpers or test utilities
```

**Rationale:**

- Only expose stable, documented APIs
- Internal helpers and test utilities are private

---

## 📝 Naming Conventions

- **Files**: `kebab-case` for files, `.ts` extension
- **Classes & Interfaces**: `PascalCase` (e.g. `LoggerFactory`, `LoggingInterceptor`)
- **Functions & Variables**: `camelCase`
- **Constants/Enums**: `UPPER_SNAKE_CASE` for values

### Path Aliases

Configured in `tsconfig.json`:

```json
"@core/*"   : ["src/core/*"],
"@infra/*"  : ["src/infra/*"],
"@nest/*"   : ["src/nest/*"],
```

Use aliases for cleaner imports:

```typescript
import { maskSensitiveData } from "@core/masking";
import { createLogger } from "@infra/logger.factory";
import { LoggingInterceptor } from "@nest/interceptor";
```

---

## 🧪 Testing

### Coverage Target: 80%+

- ✅ All core logic, helpers, and adapters must have unit tests
- ✅ All NestJS integration (interceptor, service, module) must have tests
- ✅ All transports and factories must be tested
- ✅ All new code must have tests in `test/`

**Jest Configuration:**

```javascript
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
}
```

---

## 📚 Documentation

- All public functions/methods and exported classes must have TSDoc/JSDoc
- All exported types/interfaces must be documented
- Add usage examples in README.md for new features

---

## 🚀 Development Principles

- Export ONLY public API (core, nest, createLogger)
- Never export test utilities or internal helpers
- No hardcoded business rules; all behavior should be configurable
- No direct database or external service dependencies

---

## 🔄 Workflow & Task Management

### Task-Driven Development

**1. Branch Creation:**

```bash
feature/LOGKIT-123-add-feature
bugfix/LOGKIT-456-fix-issue
refactor/LOGKIT-789-improve-code
```

**2. Task Documentation:**
Create task file at branch start:

```
docs/tasks/active/LOGKIT-123-add-feature.md
```

**3. On Release:**
Move to archive:

```
docs/tasks/archive/by-release/vX.Y.Z/LOGKIT-123-add-feature.md
```

### Development Workflow

- Read context → Implement → Update docs → **Create changeset**
- If blocked: Ask immediately, don't guess

---

## 📦 Versioning & Breaking Changes

### Semantic Versioning (Strict)

- **MAJOR** (x.0.0) - Breaking changes to public API, config, or exported types
- **MINOR** (0.x.0) - New features, new options, new adapters
- **PATCH** (0.0.x) - Bug fixes, performance, docs

### Changesets Workflow

- ALWAYS create a changeset for user-facing changes:

```bash
npx changeset
```

- When to create a changeset:
  - ✅ New features
  - ✅ Bug fixes
  - ✅ Breaking changes
  - ✅ Performance improvements
  - ❌ Internal refactoring (no user impact)
  - ❌ Documentation updates only
  - ❌ Test improvements only

- Before completing any task:
  - [ ] Code implemented
  - [ ] Tests passing
  - [ ] Documentation updated
  - [ ] **Changeset created** ← CRITICAL
  - [ ] PR ready

**Changeset format:**

```markdown
---
"loggingkit": minor
---

Added support for custom masking in LoggerFactory
```

---

## 🔐 Security Best Practices

- Never log secrets or sensitive data
- Mask PII in logs by default
- Validate all input to public APIs
- Sanitize error messages (no stack traces in production)

---

## 🚫 Restrictions - Require Approval

- NEVER without approval:
  - Breaking changes to public API
  - Changing exported types/interfaces
  - Removing exported functions
  - Major dependency upgrades
  - Security-related changes
- CAN do autonomously:
  - Bug fixes (no breaking changes)
  - Internal refactoring
  - Adding new features (non-breaking)
  - Test improvements
  - Documentation updates

---

## ✅ Release Checklist

Before publishing:

- [ ] All tests passing (100% of test suite)
- [ ] Coverage >= 80%
- [ ] No ESLint warnings (`--max-warnings=0`)
- [ ] TypeScript strict mode passing
- [ ] All public APIs documented (JSDoc)
- [ ] README updated with examples
- [ ] Changeset created
- [ ] Breaking changes highlighted
- [ ] Integration tested with sample app

---

## 🔄 Development Workflow

1. Clone LoggingKit repo
2. Create branch: `feature/LOGKIT-123-description` from `develop`
3. Implement with tests
4. **Create changeset**: `npx changeset`
5. Verify checklist
6. Create PR → `develop`

---

## 🎨 Code Style

- ESLint `--max-warnings=0`
- Prettier formatting
- TypeScript strict mode
- FP for logic, OOP for structure
- Dependency injection via constructor (for NestJS integration)

---

## 🐛 Error Handling

- Use custom error classes for domain errors (e.g. `LoggingKitConfigError`)
- Always use structured logging for errors
- Never swallow errors silently

---

## 💬 Communication Style

- Brief and direct
- Focus on results
- LoggingKit-specific context
- Highlight breaking changes immediately

---

## 📋 Summary

**LoggingKit Principles:**

1. Reusability over specificity
2. Comprehensive testing (80%+)
3. Complete documentation
4. Strict versioning
5. Breaking changes = MAJOR bump + changeset
6. Zero app coupling
7. Configurable behavior

**When in doubt:** Ask, don't assume. LoggingKit is used in multiple projects.

---

_Last Updated: 2026-02-26_  
_Version: 2.1.0_
