# Data Processing Tests

This directory contains comprehensive unit tests for the DULMS Watcher dashboard data processing functions.

## Test Structure

### Core Tests (`data-processing.test.ts`)
- **validateScrapedData**: Tests data structure validation
- **sanitizeDataForDisplay**: Tests data sanitization and fallback values
- **calculateNotificationPriority**: Tests priority calculation logic
- **parseFlexibleDate**: Tests date parsing for various formats
- **calculateTimeRemaining**: Tests time remaining calculations
- **isWithinTimeframe**: Tests timeframe filtering logic
- **determineUrgencyLevel**: Tests urgency level calculations
- **extractAllCourses**: Tests course extraction from various data sources
- **formatRelativeDate**: Tests relative date formatting
- **transformScrapedDataToNotifications**: Tests notification transformation
- **filterUpcomingTargets**: Tests upcoming targets filtering
- **calculateArchiveStatistics**: Tests archive statistics calculation
- **filterTargetsToday**: Tests today's targets filtering

### Edge Cases (`data-processing-edge-cases.test.ts`)
- Date parsing edge cases (malformed dates, timezone handling, leap years)
- Time calculation edge cases (very close times, far future dates)
- Data transformation edge cases (mixed valid/invalid data, circular references)
- Large dataset handling
- Special characters and data types

### Integration Tests (`data-processing-integration.test.ts`)
- Complete data flow from scraped data to processed output
- Data consistency between different processing functions
- Performance testing with large datasets
- Real-world data scenarios using mock DULMS data

### Hook Tests (`../hooks/__tests__/useLocalScrapeData.test.ts`)
- `useLocalScrapeData` hook behavior
- `mergeScrapeData` function logic
- localStorage integration
- User switching scenarios
- Error handling and edge cases

## Test Coverage

The tests cover:
- ✅ **Function Logic**: All data processing functions
- ✅ **Edge Cases**: Invalid inputs, boundary conditions, error scenarios
- ✅ **Integration**: Complete data flow and consistency
- ✅ **Performance**: Large dataset handling
- ✅ **Real Data**: Mock DULMS data scenarios
- ✅ **Error Handling**: Graceful degradation and error recovery

## Running Tests

### Prerequisites

First, install the testing dependencies:

```bash
cd DULMS_Watcher/frontend
npm install --save-dev @testing-library/jest-dom @testing-library/react @testing-library/user-event jest jest-environment-jsdom
```

### Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests in CI mode (no watch, with coverage)
npm run test:ci

# Run specific test file
npm test data-processing.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="parseFlexibleDate"
```

### Coverage Thresholds

The tests are configured with coverage thresholds:
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

## Test Data

### Mock Scraped Data Structure
The tests use realistic mock data that matches the actual DULMS scraper output:

```typescript
{
  quizzes: {
    courses_processed: 4,
    total_quizzes_found: 3,
    quizzes_with_results: [...],
    quizzes_without_results: [...],
    courses_found_on_page: [...],
    quiz_courses_with_no_items: [...],
    quiz_courses_failed_expansion: []
  },
  absences: {
    absences: [...]
  },
  assignments: {
    assignments: [...],
    courses_processed: 3,
    courses_found_on_page: [...],
    total_assignments_found: 2,
    assignment_courses_with_no_items: [...],
    assignment_courses_failed_expansion: []
  },
  course_registration: {
    available_courses: [...],
    registration_end_date: "20-07-2025 11:59 PM"
  }
}
```

### Date Formats Tested
- `"Jul 20, 2025 at 09:30 PM"` (Quiz/Assignment due dates)
- `"Fri, 18/07/2025"` (Absence dates)
- `"2025-07-20T21:30:00.000Z"` (ISO format)
- Various malformed and edge case formats

## Debugging Tests

### Console Output
Tests mock console methods to reduce noise, but you can enable them by modifying `jest.setup.js`:

```javascript
// Uncomment to see console output in tests
// log: jest.fn(),
// debug: jest.fn(),
// info: jest.fn(),
```

### Test Debugging
Use `console.log` in tests for debugging:

```javascript
it('should debug test data', () => {
  const result = transformScrapedDataToNotifications(mockData, null);
  console.log('Test result:', JSON.stringify(result, null, 2));
  expect(result).toBeDefined();
});
```

### Running Single Tests
To focus on a specific test during development:

```javascript
// Use 'fit' instead of 'it' to run only this test
fit('should test specific functionality', () => {
  // test code
});

// Use 'fdescribe' instead of 'describe' to run only this test suite
fdescribe('Specific test suite', () => {
  // tests
});
```

## Continuous Integration

The tests are designed to run in CI environments with:
- No watch mode
- Coverage reporting
- Deterministic results (mocked dates/times)
- Fast execution (< 30 seconds for full suite)

## Maintenance

### Adding New Tests
When adding new data processing functions:

1. Add unit tests to `data-processing.test.ts`
2. Add edge cases to `data-processing-edge-cases.test.ts`
3. Add integration scenarios to `data-processing-integration.test.ts`
4. Update this README with new test descriptions

### Updating Mock Data
When the DULMS scraper data structure changes:

1. Update mock data in integration tests
2. Update type definitions if needed
3. Ensure all tests still pass
4. Add tests for new data fields/structures

## Troubleshooting

### Common Issues

**Tests failing with date-related errors:**
- Ensure you're using `jest.useFakeTimers()` and `jest.setSystemTime()` for date-dependent tests
- Check timezone handling in date parsing functions

**localStorage errors:**
- Verify localStorage is properly mocked in `jest.setup.js`
- Check that user ID mocking is working correctly

**Import/module errors:**
- Ensure all imports use the correct path aliases (`@/...`)
- Check that Jest configuration includes proper module name mapping

**Coverage not meeting thresholds:**
- Run `npm run test:coverage` to see detailed coverage report
- Add tests for uncovered branches/functions
- Consider if coverage thresholds need adjustment