---
name: test
description: Run tests for the Unhooked app. Use when asked to run tests, verify changes, or check for regressions.
---

# Test Skill

Run the project's test suite to verify code changes and catch regressions.

## Available Commands

### Unit Tests (Fast)
Run Vitest unit and component tests:
```bash
npm run test:unit
```

### Unit Tests with Coverage
Run unit tests and generate coverage report:
```bash
npm run test:unit:coverage
```

### E2E Tests (Requires dev server)
Run Playwright end-to-end tests:
```bash
npm run test:e2e
```

## Usage Guidelines

1. **Before committing changes:** Always run `npm run test:unit` to verify nothing is broken
2. **After modifying user flows:** Run `npm run test:e2e` to verify end-to-end functionality
3. **When asked to "run tests":** Run unit tests by default, E2E only if specifically requested or if changes affect user flows
4. **If tests fail:** Report the failures clearly and offer to fix them

## Interpreting Results

- **Passing tests:** Report success briefly
- **Failing tests:** List each failure with file path, test name, and error message
- **Suggest fixes:** If the failure is obvious (e.g., changed text, renamed function), suggest the fix

## Test Locations

- Unit tests: `tests/unit/**/*.test.ts`
- E2E tests: `tests/e2e/**/*.spec.ts`
- Test setup: `tests/setup.ts`
