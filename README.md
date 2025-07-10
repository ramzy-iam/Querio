# Querio

A modern TypeScript ORM for PostgreSQL with strict typing and fluent API.

## ✨ Features

- 🎯 **100% TypeScript** with perfect type inference
- 🔗 **Fluent API** with method chaining
- 🛡️ **Strict typing** with no `any` types
- 🎪 **Scoped queries** for reusable query logic
- 🏛️ **Repository pattern** support
- 🔧 **PostgreSQL** optimized
- 🚀 **Lightweight** and performant

## 🚀 Quick Start

### Installation

```bash
pnpm add querio
# or
npm install querio
# or
yarn add querio
```

### Basic Usage

```typescript
import { 
  defineModel, 
  createRepository, 
  PostgreSQLAdapter, 
  setGlobalExecutor,
  text, 
  uuid, 
  integer, 
  boolean, 
  timestamp 
} from 'querio';

// Define a model
const User = defineModel({
  table: 'users',
  fields: {
    id: uuid({ primaryKey: true }),
    name: text(),
    email: text({ unique: true }),
    age: integer(),
    isActive: boolean({ default: true }),
    createdAt: timestamp()
  }
});

// Configure database
const dbAdapter = new PostgreSQLAdapter({
  host: 'localhost',
  port: 5432,
  database: 'myapp',
  user: 'postgres',
  password: 'password'
});

setGlobalExecutor(dbAdapter);

// Use the model
const users = await User.where({ isActive: true }).getMany();
const user = await User.where({ email: 'john@example.com' }).getOne();
const userCount = await User.count();
```

## 📖 Documentation

### Field Types

Querio supports various field types with proper TypeScript inference:

```typescript
import { text, uuid, integer, boolean, timestamp, decimal, json, nullable } from 'querio';

const MyModel = defineModel({
  table: 'my_table',
  fields: {
    id: uuid({ primaryKey: true }),
    name: text(),
    email: text({ unique: true }),
    age: integer(),
    salary: decimal(),
    isActive: boolean({ default: true }),
    createdAt: timestamp(),
    metadata: json(),
    
    // Nullable fields
    description: nullable.text(),
    lastLoginAt: nullable.timestamp(),
  }
});
```

### Query Builder

#### Basic Queries

```typescript
// Get all records
const users = await User.getMany();

// Get one record
const user = await User.getOne();

// Count records
const count = await User.count();

// Pluck a single field (returns typed array)
const emails = await User.pluck('email'); // string[]
const ages = await User.pluck('age'); // number[]
```

#### Where Conditions

```typescript
// Simple equality
const user = await User.where({ email: 'john@example.com' }).getOne();

// Multiple conditions
const users = await User
  .where({ isActive: true })
  .andWhere({ age: { gte: 18 } })
  .getMany();

// Operators
const users = await User.where({
  age: { gte: 18 },           // greater than or equal
  name: { like: '%john%' },   // SQL LIKE
  email: { ilike: '%JOHN%' }, // case-insensitive LIKE
  id: { in: ['1', '2', '3'] }, // IN operator
  deletedAt: { isNull: true }  // IS NULL
}).getMany();
```

#### Select with Type Inference

```typescript
// Select specific fields - type is automatically inferred
const userData = await User.select({ 
  name: true, 
  email: true 
}).getMany();
// Type: { name: string; email: string }[]

// Select with conditions
const activeUserEmails = await User
  .where({ isActive: true })
  .select({ email: true })
  .getMany();
// Type: { email: string }[]
```

#### Ordering and Limiting

```typescript
// Order by
const users = await User.orderBy('createdAt', 'desc').getMany();

// Limit and offset
const users = await User
  .orderBy('name', 'asc')
  .limit(10)
  .offset(20)
  .getMany();
```

#### Joins

```typescript
// Join with other tables
const usersWithProfiles = await User
  .leftJoin('profiles', 'users.id = profiles.user_id')
  .where({ isActive: true })
  .getMany();
```

#### Updates and Deletes

```typescript
// Update records
const updatedUsers = await User
  .where({ isActive: false })
  .update({ isActive: true });

// Delete records
const deletedUsers = await User
  .where({ createdAt: { lt: oldDate } })
  .delete();
```

### Repository Pattern

Create repositories with scoped queries for better organization:

```typescript
const userRepository = createRepository(User, {
  scopes: {
    active: () => (qb) => qb.where({ isActive: true }),
    adults: () => (qb) => qb.where({ age: { gte: 18 } }),
    byEmail: (email: string) => (qb) => qb.where({ email }),
    recent: (days: number = 30) => (qb) => {
      const date = new Date();
      date.setDate(date.getDate() - days);
      return qb.where({ createdAt: { gte: date } });
    }
  },
  executor: dbAdapter
});

// Use repository scopes
const activeUsers = await userRepository.scoped().active().getMany();
const recentAdults = await userRepository.scoped().adults().recent(7).getMany();
```

### Advanced Features

#### Transactions

```typescript
await dbAdapter.transaction(async (client) => {
  const executor = new TransactionExecutor(client);
  
  // All operations within this block will be in the same transaction
  const user = await User.where({ id: userId }).getOne();
  await User.where({ id: userId }).update({ lastLoginAt: new Date() });
  
  // Transaction will be committed automatically
  // Or rolled back if any error occurs
});
```

#### Custom Scopes

```typescript
// Define reusable scopes
const accountRepository = createRepository(Account, {
  scopes: {
    byUserId: (userId: string) => (qb) => qb.where({ userId }),
    withMinBalance: (amount: number) => (qb) => qb.where({ balance: { gte: amount } }),
    searchByName: (term: string) => (qb) => qb.where({ name: { ilike: `%${term}%` } })
  },
  executor: dbAdapter
});

// Chain scopes
const userAccounts = await accountRepository
  .scoped()
  .byUserId('user-123')
  .withMinBalance(1000)
  .searchByName('savings')
  .getMany();
```

## 🔧 Configuration

### Database Configuration

```typescript
const dbAdapter = new PostgreSQLAdapter({
  host: 'localhost',
  port: 5432,
  database: 'myapp',
  user: 'postgres',
  password: 'password',
  ssl: false, // Enable for production
  max: 10, // Maximum number of connections in pool
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 2000 // Connection timeout
});
```

### Environment Variables

```bash
# .env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=myapp
DB_USER=postgres
DB_PASSWORD=password
DB_SSL=false
```

```typescript
const dbAdapter = new PostgreSQLAdapter({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'myapp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_SSL === 'true'
});
```

## 🧪 Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test -- --coverage

# Run tests in watch mode
pnpm test -- --watch
```

## 🏗️ Building

```bash
# Build the project
pnpm build

# Build in watch mode
pnpm dev

# Clean build directory
pnpm clean
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by [Prisma](https://www.prisma.io/) and [Drizzle ORM](https://orm.drizzle.team/)
- Built with ❤️ and TypeScript

---

## 📚 API Reference

### Core Functions

- `defineModel(config)` - Define a model with fields and table name
- `createRepository(model, config)` - Create a repository with scopes
- `setGlobalExecutor(executor)` - Set the global database executor

### Field Types

- `text(options?)` - Text/string field
- `uuid(options?)` - UUID field
- `integer(options?)` - Integer/number field
- `boolean(options?)` - Boolean field
- `timestamp(options?)` - Date/timestamp field
- `decimal(options?)` - Decimal/number field
- `json(options?)` - JSON field
- `nullable.*` - Nullable versions of all field types

### Query Builder Methods

- `.where(condition)` - Add WHERE condition
- `.andWhere(condition)` - Add AND WHERE condition
- `.orWhere(condition)` - Add OR WHERE condition
- `.orderBy(field, direction?)` - Add ORDER BY clause
- `.limit(count)` - Add LIMIT clause
- `.offset(count)` - Add OFFSET clause
- `.select(fields)` - Select specific fields
- `.getMany()` - Get all matching records
- `.getOne()` - Get first matching record
- `.pluck(field)` - Get array of single field values
- `.count()` - Get count of matching records
- `.update(data)` - Update matching records
- `.delete()` - Delete matching records

### Join Methods

- `.innerJoin(table, on, alias?)` - INNER JOIN
- `.leftJoin(table, on, alias?)` - LEFT JOIN
- `.rightJoin(table, on, alias?)` - RIGHT JOIN

## 🔍 Type Safety

Querio provides complete type safety throughout the entire API:

```typescript
// ✅ This will work and be properly typed
const user = await User.select({ name: true, email: true }).getOne();
// Type: { name: string; email: string } | null

// ❌ This will cause a TypeScript error
const user = await User.select({ name: true, invalidField: true }).getOne();
// Error: Property 'invalidField' does not exist

// ✅ Pluck returns correctly typed arrays
const emails = await User.pluck('email'); // string[]
const ages = await User.pluck('age'); // number[]

// ❌ This will cause a TypeScript error
const invalid = await User.pluck('invalidField');
// Error: Argument of type 'invalidField' is not assignable
```
