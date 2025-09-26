# NLWeb AI Agent - Testing Strategy

This document outlines the comprehensive testing strategy for the NLWeb AI Agent application, ensuring full test coverage and quality assurance.

## 🏗️ Testing Architecture

### Test Structure
```
tests/
├── fixtures/           # Test data and fixtures
├── integration/        # Integration tests
│   ├── api.test.ts     # API endpoint tests
│   └── nlweb.test.ts   # NLWeb-specific integration tests
├── setup.ts           # Test environment setup
└── unit/              # Unit tests
    ├── nlwebService.test.ts    # NLWeb service tests
    ├── queryService.test.ts    # Query service tests
    └── validation.test.ts      # Validation utility tests
```

## 📋 Test Categories

### 1. Unit Tests
**Location**: `tests/unit/`

#### NLWeb Service Tests (`nlwebService.test.ts`)
- ✅ Core functionality (query processing, response generation)
- ✅ MCP protocol implementation (ask, search, health, ingest methods)
- ✅ Content ingestion (Schema.org, JSONL, RSS, plain text)
- ✅ Search functionality (relevance scoring, snippet extraction)
- ✅ Error handling (invalid queries, malformed content)
- ✅ Performance testing (processing time, concurrent queries)

#### Query Service Tests (`queryService.test.ts`)
- ✅ OpenAI integration
- ✅ NLWeb context enrichment
- ✅ Query type detection
- ✅ Error handling and validation

#### Validation Tests (`validation.test.ts`)
- ✅ Input validation
- ✅ Environment variable validation
- ✅ Error handling

### 2. Integration Tests
**Location**: `tests/integration/`

#### API Tests (`api.test.ts`)
- ✅ Main query endpoint (`/api/query`)
- ✅ NLWeb endpoints (`/api/nlweb/ask`, `/api/nlweb/ingest`, `/api/nlweb/mcp`)
- ✅ Error handling and edge cases
- ✅ Response format validation
- ✅ HTTP status code validation

#### NLWeb Integration Tests (`nlweb.test.ts`)
- ✅ End-to-end NLWeb functionality
- ✅ MCP server integration
- ✅ Content ingestion workflows
- ✅ Large payload handling

## 🧪 Test Coverage Requirements

### Coverage Thresholds
```json
{
  "global": {
    "branches": 80,
    "functions": 85,
    "lines": 85,
    "statements": 85
  }
}
```

### Coverage Exclusions
- `src/index.ts` (Entry point has limited test value)
- `src/routes/` (Thin wrappers around services)
- `src/**/*.d.ts` (Type definition files)

## 🚀 Running Tests

### All Tests
```bash
npm test
```

### With Coverage
```bash
# Basic coverage
npm run test:coverage

# HTML coverage report
npm run test:coverage:html

# Detailed coverage with verbose output
npm run test:coverage:detailed

# Generate coverage summary
npm run test:report
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### Watch Mode
```bash
npm run test:watch
```

### Type Checking + Coverage
```bash
npm run test:all
```

## 🛠️ Test Setup

### Environment Configuration
Tests run with:
- `NODE_ENV=test`
- Mocked OpenAI API key
- Mocked Winston logger
- Mocked external dependencies

### Mock Strategy
- **OpenAI**: Mocked with jest mocks
- **Logger**: Comprehensive winston logger mocks
- **NLWeb Service**: Full service implementation with in-memory storage
- **External APIs**: No external dependencies in tests

## 📊 Coverage Reporting

### Coverage Reports Generated
1. **Text Report** (`coverage/lcov-report/index.html`)
2. **LCOV Report** (for CI/CD integration)
3. **JSON Summary** (`coverage/coverage-summary.json`)
4. **HTML Report** (visual coverage analysis)

### Interpreting Coverage Results
- **Lines**: Code execution coverage
- **Functions**: Function/method execution coverage
- **Branches**: Conditional logic coverage (if/else, switch statements)
- **Statements**: Overall statement coverage

## 🧪 Testing Best Practices

### 1. Test Independence
- Each test is independent
- Tests can run in parallel
- No shared state between tests
- Proper cleanup after each test

### 2. Test Data Management
- Use fixtures for consistent test data
- Mock external dependencies
- Validate both success and error cases

### 3. Test Naming Conventions
```typescript
// Good examples:
describe('NLWebService', () => {
  describe('Core Functionality', () => {
    test('should handle natural language queries', async () => {
      // Test implementation
    });

    test('should return structured Schema.org compatible responses', async () => {
      // Test implementation
    });
  });
});
```

### 4. Test Case Prioritization
1. **Critical Path Tests**: Core functionality
2. **Error Handling Tests**: Edge cases and failures
3. **Performance Tests**: Processing time and concurrency
4. **Integration Tests**: End-to-end workflows

## 🔍 Test Fixtures

### Sample Test Data (`tests/fixtures/nlweb-fixtures.ts`)
- Mock Schema.org content
- Mock plain text content
- Mock RSS content
- Expected response structures
- MCP request/response fixtures

## 📈 Continuous Integration

### GitHub Actions Workflow
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:all
      - uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

## 🐛 Debugging Tests

### Debug Failed Tests
```bash
# Run specific test file
npx jest tests/unit/nlwebService.test.ts

# Run with verbose output
npx jest --verbose

# Run with debugger
npx jest --inspect-brk
```

### Common Issues
1. **Mock Setup**: Ensure all dependencies are properly mocked
2. **Async Operations**: Use proper async/await patterns
3. **Test Isolation**: Verify tests don't share state
4. **Timeout Issues**: Increase timeout for slow operations

## 📋 Test Checklist

### Before Merging
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Coverage meets thresholds
- [ ] No linting errors
- [ ] TypeScript compilation passes
- [ ] New functionality has corresponding tests
- [ ] Tests run in CI environment

### Code Review Checklist
- [ ] Tests follow naming conventions
- [ ] Tests are comprehensive and cover edge cases
- [ ] Mocks are appropriate and realistic
- [ ] Test data is representative
- [ ] Error scenarios are tested
- [ ] Performance implications are considered

## 🎯 Future Enhancements

### Planned Test Improvements
1. **E2E Tests**: Add Playwright/Selenium tests for UI
2. **Performance Testing**: Load testing for high-traffic scenarios
3. **Security Testing**: Input validation and sanitization tests
4. **Accessibility Testing**: WCAG compliance verification
5. **Cross-browser Testing**: Browser compatibility validation

### Test Automation
- Automated test generation for new features
- Test impact analysis for code changes
- Continuous test maintenance and updates

## 📞 Support

For questions about the testing strategy or implementation:
- Review this documentation
- Check existing test files for examples
- Consult with the development team
- Update documentation as needed

---

**Last Updated**: 2024
**Coverage Target**: 85%+ for all metrics
**Test Framework**: Jest + Supertest
