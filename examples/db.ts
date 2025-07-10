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

export async function createTables() {
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

export async function seedData() {
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
    // await createTables();
    // await seedData();

    console.log('-----------------------------------------------');

    // Test enhanced getMany with options and typed WhereCondition
    const usersWithSelect = await userRepository.getMany({
      where: { 
        isActive: true,
        age: { gte: 20, lt: 50 }  // Typage complet avec opérateurs !
      },
      select: { name: true, email: true, age: true },
      orderBy: { field: 'name', direction: 'asc' },
      limit: 1,
      offset: 1
    });
    console.log('Users with select and typed where:', usersWithSelect);

      // Test enhanced getOne with options
      const oneUserWithSelect = await userRepository.getOne({
        where: { 
          email: 'john@example.com',
          isActive: true 
        },
        select: { id: true, name: true, age: true }
      });
      console.log('One user with select:', oneUserWithSelect);

    // Test pagination with getManyPaginated
    const paginatedUsers = await userRepository.getManyPaginated({
      where: { isActive: true },
      orderBy: { field: 'name', direction: 'asc' },
      pagination: { page: 1, pageSize: 2 }
    });
    console.log('Paginated users (page 1, size 2):', paginatedUsers);

    // Test pagination with select
    const paginatedUsersWithSelect = await userRepository.getManyPaginated({
      where: { isActive: true },
      select: { name: true, email: true },
      orderBy: { field: 'age', direction: 'asc' },
      pagination: { page: 1, pageSize: 1 }
    });
    console.log('Paginated users with select:', paginatedUsersWithSelect);

    // Test scoped pagination
    const scopedPaginated = await userRepository.scoped
      .active()
      .orderBy('createdAt', 'desc')
      .getManyPaginated({ page: 1, pageSize: 3 });
    console.log('Scoped paginated users:', scopedPaginated);

    // Test logical operators (AND/OR)
    console.log('\n--- Testing Logical Operators (AND/OR) ---');
    
    // Test OR operator
    const usersWithOr = await userRepository.getMany({
      where: {
        OR: [
          { name: 'John Doe' },
          { name: 'Jane Smith' },
          { age: { gte: 35 } }
        ]
      },
      select: { name: true, age: true }
    });
    console.log('Users with OR conditions:', usersWithOr);

    // Test AND operator
    const usersWithAnd = await userRepository.getMany({
      where: {
        AND: [
          { isActive: true },
          { age: { gte: 20 } },
          { name: { like: '%o%' } }
        ]
      },
      select: { name: true, age: true, isActive: true }
    });
    console.log('Users with AND conditions:', usersWithAnd);

    // Test mixed AND/OR
    const usersWithMixed = await userRepository.getMany({
      where: {
        isActive: true,
        OR: [
          { age: { lt: 30 } },
          { name: { like: '%Alice%' } }
        ]
      },
      select: { name: true, age: true, isActive: true }
    });
    console.log('Users with mixed AND/OR conditions:', usersWithMixed);

    // Test nested logical operators
    const usersWithNested = await userRepository.getMany({
      where: {
        AND: [
          { isActive: true },
          {
            OR: [
              { age: { gte: 30 } },
              { name: { like: '%Jane%' } }
            ]
          }
        ]
      },
      select: { name: true, age: true, isActive: true }
    });
    console.log('Users with nested logical operators:', usersWithNested);





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
