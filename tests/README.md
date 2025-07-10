# Querio Repository Integration Tests

This file contains comprehensive integration tests for all repository methods using real database connections.

## Overview

The integration tests cover:

### Basic Repository Methods
- `getMany()` - Retrieve multiple records with various options
- `getOne()` - Retrieve a single record 
- `count()` - Count total records
- `pluck()` - Extract specific field values
- `update()` - Update records (implementation needed)
- `delete()` - Delete records (implementation needed)

### Advanced Features
- **Pagination** - `getManyPaginated()` with page-based results
- **Field Selection** - Using `select` to choose specific fields
- **Complex Where Conditions** - Including logical operators (AND/OR)
- **Scoped Queries** - Chainable scope methods for common filters
- **Query Builder Methods** - Direct access to query builder functionality

### Test Scenarios

#### 1. Basic CRUD Operations
- Fetching all records
- Filtering with where conditions
- Selecting specific fields
- Ordering, limiting, and offsetting results

#### 2. Pagination
- Page-based pagination with metadata
- Pagination with field selection
- Edge cases (empty results, beyond total pages)

#### 3. Logical Operators
- OR conditions
- AND conditions  
- Mixed AND/OR operators
- Nested logical operators

#### 4. Scoped Queries
- Individual scopes (`active`, `byAge`, `byEmail`, etc.)
- Chained scopes (`active().byAge(25)`)
- Scoped queries with selection, ordering, and pagination
- Scoped count and pluck operations

#### 5. Error Handling
- Invalid field names in where conditions
- Invalid field names in select clauses
- Database connection errors

#### 6. Edge Cases
- Empty where conditions
- Null value handling in comparisons
- Limits larger than available records
- Offsets beyond result set

## Database Setup

The tests use PostgreSQL and require:

1. **Database**: `querio_test` (or configured via `DB_NAME`)
2. **Tables**: 
   - `test_users` - For user-related tests
   - `test_accounts` - For account-related tests

### Environment Variables

```bash
DB_HOST=localhost      # Database host
DB_PORT=5432          # Database port  
DB_NAME=querio_test   # Database name
DB_USER=postgres      # Database user
DB_PASSWORD=postgres  # Database password
```

## Running the Tests

```bash
# Run all integration tests
pnpm test:integration

# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

## Test Data

Each test starts with fresh data:

### Users
- John Doe (30, active)
- Jane Smith (25, active) 
- Bob Wilson (35, inactive)
- Alice Brown (null age, active)
- Charlie Davis (40, active)

### Accounts
- Checking Account ($1,000, active, John's)
- Savings Account ($5,000, active, John's)
- Investment Account ($15,000, active, Jane's)
- Business Account ($2,500, inactive, Bob's)
- Emergency Fund ($8,000, active, Alice's)

## Key Features Tested

### Repository Scopes
Scopes are chainable methods that add conditions to queries:

```typescript
// Individual scopes
await userRepository.scoped.active().getMany()
await userRepository.scoped.byAge(25).getMany()

// Chained scopes (uses andWhere internally)
await userRepository.scoped
  .active()
  .byAge(25)
  .orderBy('name', 'asc')
  .getMany()
```

### Pagination
Comprehensive pagination with metadata:

```typescript
const result = await userRepository.getManyPaginated({
  where: { isActive: true },
  orderBy: { field: 'name', direction: 'asc' },
  pagination: { page: 1, pageSize: 2 }
});

// Returns:
// {
//   data: [...],
//   pagination: {
//     currentPage: 1,
//     pageSize: 2,
//     totalItems: 4,
//     totalPages: 2,
//     hasNextPage: true,
//     hasPreviousPage: false
//   }
// }
```

### Logical Operators
Support for complex where conditions:

```typescript
// OR conditions
await userRepository.getMany({
  where: {
    OR: [
      { name: 'John Doe' },
      { age: { gte: 40 } }
    ]
  }
})

// AND conditions with nested OR
await userRepository.getMany({
  where: {
    isActive: true,
    OR: [
      { age: { lt: 30 } },
      { name: { like: '%Alice%' } }
    ]
  }
})
```

## Notes

- Tests use `andWhere()` in scopes to enable proper chaining
- Each test starts with fresh data (cleanup + reseed)
- Database tables are created and dropped automatically
- Connection pooling is handled by the PostgreSQL adapter
- All tests are atomic and isolated
