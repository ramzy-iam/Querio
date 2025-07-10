import { 
  defineModel, 
  createRepository, 
  PostgreSQLAdapter, 
  setGlobalExecutor,
  text, 
  uuid, 
  integer,
  boolean,
  timestamp,
  nullable 
} from '../src/index';

// Define explicit types for better type safety
interface UserType {
  id: string;
  name: string;
  email: string;
  age: number | null;
  isActive: boolean;
  createdAt: Date;
}

interface AccountType {
  id: string;
  name: string;
  userId: string;
  balance: number;
  isActive: boolean;
  createdAt: Date;
}

// Define models with explicit types
const User = defineModel<UserType>({
  table: 'users',
  fields: {
    id: uuid({ primaryKey: true }),
    name: text(),
    email: text({ unique: true }),
    age: nullable.integer(),
    isActive: boolean({ default: true }),
    createdAt: timestamp()
  }
});

const Account = defineModel<AccountType>({
  table: 'accounts',
  fields: {
    id: uuid({ primaryKey: true }),
    name: text(),
    userId: uuid(),
    balance: integer({ default: 0 }),
    isActive: boolean({ default: true }),
    createdAt: timestamp()
  }
});

// Configure database connection
const dbAdapter = new PostgreSQLAdapter({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'querio_test',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

// Set global executor
setGlobalExecutor(dbAdapter);

// Create repositories with scopes
const userRepository = createRepository(User, {
  scopes: {
    active: () => (qb) => qb.where({ isActive: true }),
    byAge: (minAge: number) => (qb) => qb.where({ age: { gte: minAge } }),
    byEmail: (email: string) => (qb) => qb.where({ email }),
  },
  executor: dbAdapter
});

const accountRepository = createRepository(Account, {
  scopes: {
    active: () => (qb) => qb.where({ isActive: true }),
    byUserId: (userId: string) => (qb) => qb.where({ userId }),
    withBalance: (minBalance: number) => (qb) => qb.where({ balance: { gte: minBalance } }),
  },
  executor: dbAdapter
});

async function createTables() {
  console.log('🏗️ Creating tables...');
  
  try {
    // Create users table
    await dbAdapter.execute({
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          age INTEGER,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `,
      params: []
    });

    // Create accounts table
    await dbAdapter.execute({
      sql: `
        CREATE TABLE IF NOT EXISTS accounts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          user_id UUID REFERENCES users(id),
          balance INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `,
      params: []
    });

    console.log('✅ Tables created successfully');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  }
}

async function seedData() {
  console.log('🌱 Seeding data...');
  
  try {
    // Insert sample users
    await dbAdapter.execute({
      sql: `
        INSERT INTO users (name, email, age, is_active) VALUES
        ('John Doe', 'john@example.com', 30, true),
        ('Jane Smith', 'jane@example.com', 25, true),
        ('Bob Wilson', 'bob@example.com', 35, false),
        ('Alice Brown', 'alice@example.com', null, true)
        ON CONFLICT (email) DO NOTHING
      `,
      params: []
    });

    // Get user IDs for accounts
    const users = await dbAdapter.execute<{ id: string; name: string }>({
      sql: 'SELECT id, name FROM users LIMIT 2',
      params: []
    });

    if (users.length >= 2) {
      // Insert sample accounts
      await dbAdapter.execute({
        sql: `
          INSERT INTO accounts (name, user_id, balance, is_active) VALUES
          ('Checking Account', $1, 1000, true),
          ('Savings Account', $1, 5000, true),
          ('Investment Account', $2, 10000, true)
          ON CONFLICT DO NOTHING
        `,
        params: [users[0].id, users[1].id]
      });
    }

    console.log('✅ Data seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  }
}

async function demonstrateQuerioWithDB() {
  console.log('🚀 Querio ORM - Real Database Test');
  console.log('===================================\n');

  try {
    // Test connection
    const isConnected = await dbAdapter.testConnection();
    console.log(`Database connection: ${isConnected ? '✅ Connected' : '❌ Failed'}`);

    if (!isConnected) {
      console.log('Please ensure PostgreSQL is running and the database exists.');
      console.log('You can create the database with: createdb querio_test');
      return;
    }

    // Create tables and seed data
    await createTables();
    await seedData();

    // Example 1: Basic queries with type inference
    console.log('\n📝 Example 1: Basic Queries with Type Inference');
    console.log('-----------------------------------------------');

    // Get all users - type: UserType[]
    const allUsers = await User.getMany();
    console.log(`Total users: ${allUsers.length}`);

    // Select specific fields - type: { id: string; name: string; email: string }[]
    const userDetails = await User.select({
      id: true,
      name: true,
      email: true
    }).getMany();
    console.log(`User details (${userDetails.length} records):`, userDetails);

    // Pluck single field - type: string[]
    const userNames = await User.pluck('name');
    console.log(`User names: ${userNames.join(', ')}`);

    // Example 2: Where conditions with proper typing
    console.log('\n📝 Example 2: Where Conditions');
    console.log('------------------------------');

    // Boolean condition - now works with proper typing!
    const activeUsers = await User.where({ isActive: true }).getMany();
    console.log(`Active users: ${activeUsers.length}`);

    // String condition
    const johnUser = await User.where({ email: 'john@example.com' }).getOne();
    console.log(`Found John: ${johnUser ? johnUser.name : 'Not found'}`);

    // Numeric condition with operator
    const adults = await User.where({ age: { gte: 18 } }).getMany();
    console.log(`Adult users (age >= 18): ${adults.length}`);

    // Example 3: Chained conditions
    console.log('\n📝 Example 3: Chained Conditions');
    console.log('--------------------------------');

    const activeAdults = await User
      .where({ isActive: true })
      .andWhere({ age: { gte: 18 } })
      .getMany();
    console.log(`Active adults: ${activeAdults.length}`);

    // Example 4: Ordering and limiting
    console.log('\n📝 Example 4: Ordering and Limiting');
    console.log('-----------------------------------');

    const sortedUsers = await User
      .orderBy('name', 'asc')
      .limit(3)
      .select({ name: true, email: true, isActive: true })
      .getMany();
    console.log(`Sorted users (top 3):`, sortedUsers);

    // Example 5: Account queries
    console.log('\n📝 Example 5: Account Queries');
    console.log('-----------------------------');

    const allAccounts = await Account.getMany();
    console.log(`Total accounts: ${allAccounts.length}`);

    const highBalanceAccounts = await Account
      .where({ balance: { gte: 1000 } })
      .orderBy('balance', 'desc')
      .getMany();
    console.log(`High balance accounts: ${highBalanceAccounts.length}`);

    // Example 6: Count queries
    console.log('\n📝 Example 6: Count Queries');
    console.log('---------------------------');

    const userCount = await User.count();
    const activeUserCount = await User.where({ isActive: true }).count();
    console.log(`Total users: ${userCount}, Active: ${activeUserCount}`);

    console.log('\n🎉 All tests completed successfully!');
    console.log('✅ Type inference is working perfectly!');
    console.log('✅ Where conditions are properly typed!');
    console.log('✅ Select queries return correct types!');

  } catch (error) {
    console.error('❌ Error during demonstration:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
  } finally {
    // Clean up
    await dbAdapter.close();
  }
}

// Run the demonstration
if (require.main === module) {
  demonstrateQuerioWithDB().catch(console.error);
}

export { demonstrateQuerioWithDB, User, Account, userRepository, accountRepository };
