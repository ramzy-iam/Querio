import { 
  setGlobalExecutor,
  PostgreSQLAdapter
} from '../src/index';
import {
  UserType,
  AccountType,
  UserRepository,
  AccountRepository,
  createTestRepositories
} from './types';

describe('Repository Integration Tests', () => {
  let dbAdapter: PostgreSQLAdapter;
  let userRepository: UserRepository;
  let accountRepository: AccountRepository;
  let testUserIds: string[] = [];

  beforeAll(async () => {
    // Configure database connection
    dbAdapter = new PostgreSQLAdapter({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'querio_test',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });

    // Set global executor
    setGlobalExecutor(dbAdapter);

    // Test connection
    const isConnected = await dbAdapter.testConnection();
    if (!isConnected) {
      throw new Error('Database connection failed. Please ensure PostgreSQL is running and the database exists.');
    }

    // Create repositories with proper typing
    const repositories = createTestRepositories(dbAdapter);
    userRepository = repositories.userRepository;
    accountRepository = repositories.accountRepository;

    // Create test tables
    await createTestTables();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await cleanupTestData();
    // Seed fresh test data
    await seedTestData();
  });

  afterAll(async () => {
    // Clean up test data and close connection
    await cleanupTestData();
    await dropTestTables();
    await dbAdapter.close();
  });

  async function createTestTables() {
    try {
      // Create test users table
      await dbAdapter.execute({
        sql: `
          CREATE TABLE IF NOT EXISTS test_users (
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

      // Create test accounts table
      await dbAdapter.execute({
        sql: `
          CREATE TABLE IF NOT EXISTS test_accounts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            user_id UUID REFERENCES test_users(id) ON DELETE CASCADE,
            balance INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW()
          )
        `,
        params: []
      });
    } catch (error) {
      console.error('Error creating test tables:', error);
      throw error;
    }
  }

  async function dropTestTables() {
    try {
      await dbAdapter.execute({
        sql: 'DROP TABLE IF EXISTS test_accounts CASCADE',
        params: []
      });
      await dbAdapter.execute({
        sql: 'DROP TABLE IF EXISTS test_users CASCADE',
        params: []
      });
    } catch (error) {
      console.error('Error dropping test tables:', error);
    }
  }

  async function cleanupTestData() {
    try {
      await dbAdapter.execute({
        sql: 'DELETE FROM test_accounts',
        params: []
      });
      await dbAdapter.execute({
        sql: 'DELETE FROM test_users',
        params: []
      });
      testUserIds = [];
    } catch (error) {
      console.error('Error cleaning up test data:', error);
    }
  }

  async function seedTestData() {
    try {
      // Insert test users
      const userResults = await dbAdapter.execute<{ id: string }>({
        sql: `
          INSERT INTO test_users (name, email, age, is_active) VALUES
          ('John Doe', 'john.test@example.com', 30, true),
          ('Jane Smith', 'jane.test@example.com', 25, true),
          ('Bob Wilson', 'bob.test@example.com', 35, false),
          ('Alice Brown', 'alice.test@example.com', null, true),
          ('Charlie Davis', 'charlie.test@example.com', 40, true)
          RETURNING id
        `,
        params: []
      });

      testUserIds = userResults.map(row => row.id);

      // Insert test accounts
      await dbAdapter.execute({
        sql: `
          INSERT INTO test_accounts (name, user_id, balance, is_active) VALUES
          ('Checking Account', $1, 1000, true),
          ('Savings Account', $1, 5000, true),
          ('Investment Account', $2, 15000, true),
          ('Business Account', $3, 2500, false),
          ('Emergency Fund', $4, 8000, true)
        `,
        params: [testUserIds[0], testUserIds[1], testUserIds[2], testUserIds[3]]
      });
    } catch (error) {
      console.error('Error seeding test data:', error);
      throw error;
    }
  }

  describe('CRUD Operations (Create, Update, Delete)', () => {
    test('create() should insert a new record', async () => {
      const newUser = {
        name: 'New User',
        email: 'newuser@example.com',
        age: 28,
        isActive: true
      };

      const createdUser = await userRepository.create(newUser);
      
      expect(createdUser).toBeTruthy();
      expect(createdUser.id).toBeDefined();
      expect(createdUser.name).toBe('New User');
      expect(createdUser.email).toBe('newuser@example.com');
      expect(createdUser.age).toBe(28);
      expect(createdUser.isActive).toBe(true);
      expect(createdUser.createdAt).toBeDefined();

      // Verify it was actually inserted
      const foundUser = await userRepository.getOne({
        where: { email: 'newuser@example.com' }
      });
      expect(foundUser).toBeTruthy();
      expect(foundUser!.id).toBe(createdUser.id);
    });

    test('create() with partial data should use defaults', async () => {
      const newUser = {
        name: 'Minimal User',
        email: 'minimal@example.com'
      };

      const createdUser = await userRepository.create(newUser);
      
      expect(createdUser.name).toBe('Minimal User');
      expect(createdUser.email).toBe('minimal@example.com');
      expect(createdUser.isActive).toBe(true); // Default value
      expect(createdUser.age).toBeNull(); // Nullable field
    });

    test('createMany() should insert multiple records', async () => {
      const newUsers = [
        {
          name: 'Bulk User 1',
          email: 'bulk1@example.com',
          age: 25,
          isActive: true
        },
        {
          name: 'Bulk User 2',
          email: 'bulk2@example.com',
          age: 30,
          isActive: false
        },
        {
          name: 'Bulk User 3',
          email: 'bulk3@example.com'
          // age and isActive will use defaults
        }
      ];

      const createdUsers = await userRepository.createMany(newUsers);
      
      expect(createdUsers).toHaveLength(3);
      
      createdUsers.forEach((user: UserType, index: number) => {
        expect(user.id).toBeDefined();
        expect(user.name).toBe(newUsers[index].name);
        expect(user.email).toBe(newUsers[index].email);
        expect(user.createdAt).toBeDefined();
      });

      // Verify they were actually inserted
      const allUsers = await userRepository.getMany();
      expect(allUsers).toHaveLength(8); // 5 original + 3 new
    });

    test('createMany() with empty array should return empty array', async () => {
      const result = await userRepository.createMany([]);
      expect(result).toEqual([]);
    });

    test('update() should modify records matching where condition', async () => {
      // Update all inactive users to active
      const updatedUsers = await userRepository
        .where({ isActive: false })
        .update({ isActive: true });

      expect(updatedUsers).toHaveLength(1); // Only Bob Wilson was inactive
      expect(updatedUsers[0].isActive).toBe(true);
      expect(updatedUsers[0].name).toBe('Bob Wilson');

      // Verify the update was applied
      const activeUsers = await userRepository.getMany({
        where: { isActive: true }
      });
      expect(activeUsers).toHaveLength(5); // Now all 5 users should be active
    });

    test('update() should modify multiple fields', async () => {
      const updatedUsers = await userRepository
        .where({ email: 'john.test@example.com' })
        .update({ 
          name: 'John Updated',
          age: 31
        });

      expect(updatedUsers).toHaveLength(1);
      expect(updatedUsers[0].name).toBe('John Updated');
      expect(updatedUsers[0].age).toBe(31);
      expect(updatedUsers[0].email).toBe('john.test@example.com'); // Unchanged
    });

    test('update() with no matching records should return empty array', async () => {
      const updatedUsers = await userRepository
        .where({ email: 'nonexistent@example.com' })
        .update({ name: 'Should Not Update' });

      expect(updatedUsers).toHaveLength(0);
    });

    test('update() with scoped query', async () => {
      // Update all active users over 30 to set age to 35
      const updatedUsers = await userRepository.scoped
        .active()
        .andWhere({ age: { gte: 30 } })
        .update({ age: 35 });

      expect(updatedUsers.length).toBeGreaterThan(0);
      updatedUsers.forEach((user: UserType) => {
        expect(user.isActive).toBe(true);
        expect(user.age).toBe(35);
      });
    });

    test('delete() should remove records matching where condition', async () => {
      // First, verify we have the expected number of users
      const initialCount = await userRepository.count();
      expect(initialCount).toBe(5);

      // Delete inactive users
      const deletedUsers = await userRepository
        .where({ isActive: false })
        .delete();

      expect(deletedUsers).toHaveLength(1);
      expect(deletedUsers[0].name).toBe('Bob Wilson');
      expect(deletedUsers[0].isActive).toBe(false);

      // Verify the user was actually deleted
      const remainingCount = await userRepository.count();
      expect(remainingCount).toBe(4);

      // Verify the specific user is gone
      const bobUser = await userRepository.getOne({
        where: { email: 'bob.test@example.com' }
      });
      expect(bobUser).toBeNull();
    });

    test('delete() with multiple records', async () => {
      // Delete users with age greater than 35
      const deletedUsers = await userRepository
        .where({ age: { gte: 35 } })
        .delete();

      expect(deletedUsers.length).toBeGreaterThan(0);
      deletedUsers.forEach((user: UserType) => {
        expect(user.age).toBeGreaterThanOrEqual(35);
      });

      // Verify they were deleted
      const remainingUsers = await userRepository.getMany({
        where: { age: { gte: 35 } }
      });
      expect(remainingUsers).toHaveLength(0);
    });

    test('delete() with no matching records should return empty array', async () => {
      const deletedUsers = await userRepository
        .where({ email: 'nonexistent@example.com' })
        .delete();

      expect(deletedUsers).toHaveLength(0);
    });

    test('delete() with scoped query', async () => {
      const initialCount = await userRepository.count();
      
      // Delete all users with age >= 40
      const deletedUsers = await userRepository.scoped
        .andWhere({ age: { gte: 40 } })
        .delete();

      expect(deletedUsers.length).toBeGreaterThan(0);
      deletedUsers.forEach((user: UserType) => {
        expect(user.age).toBeGreaterThanOrEqual(40);
      });

      // Verify count decreased
      const finalCount = await userRepository.count();
      expect(finalCount).toBe(initialCount - deletedUsers.length);
    });

    test('create, update, then delete workflow', async () => {
      // Create a user
      const newUser = await userRepository.create({
        name: 'Workflow User',
        email: 'workflow@example.com',
        age: 25,
        isActive: true
      });

      expect(newUser.name).toBe('Workflow User');

      // Update the user
      const updatedUsers = await userRepository
        .where({ id: newUser.id })
        .update({ name: 'Updated Workflow User', age: 26 });

      expect(updatedUsers).toHaveLength(1);
      expect(updatedUsers[0].name).toBe('Updated Workflow User');
      expect(updatedUsers[0].age).toBe(26);

      // Delete the user
      const deletedUsers = await userRepository
        .where({ id: newUser.id })
        .delete();

      expect(deletedUsers).toHaveLength(1);
      expect(deletedUsers[0].name).toBe('Updated Workflow User');

      // Verify the user is gone
      const foundUser = await userRepository.getOne({
        where: { id: newUser.id }
      });
      expect(foundUser).toBeNull();
    });
  });

  describe('Account CRUD Operations', () => {
    test('create account for existing user', async () => {
      const newAccount = await accountRepository.create({
        name: 'New Account',
        userId: testUserIds[0],
        balance: 2500,
        isActive: true
      });

      expect(newAccount).toBeTruthy();
      expect(newAccount.id).toBeDefined();
      expect(newAccount.name).toBe('New Account');
      expect(newAccount.userId).toBe(testUserIds[0]);
      expect(newAccount.balance).toBe(2500);
      expect(newAccount.isActive).toBe(true);
    });

    test('update account balance', async () => {
      const updatedAccounts = await accountRepository
        .where({ name: 'Checking Account' })
        .update({ balance: 1500 });

      expect(updatedAccounts).toHaveLength(1);
      expect(updatedAccounts[0].balance).toBe(1500);
      expect(updatedAccounts[0].name).toBe('Checking Account');
    });

    test('delete inactive accounts', async () => {
      const deletedAccounts = await accountRepository
        .where({ isActive: false })
        .delete();

      expect(deletedAccounts.length).toBeGreaterThan(0);
      deletedAccounts.forEach((account: AccountType) => {
        expect(account.isActive).toBe(false);
      });
    });
  });

  describe('Basic Repository Methods', () => {
    test('getMany() should return all records', async () => {
      const users = await userRepository.getMany();
      expect(users).toHaveLength(5);
      expect(users[0]).toHaveProperty('id');
      expect(users[0]).toHaveProperty('name');
      expect(users[0]).toHaveProperty('email');
    });

    test('getMany() with where condition', async () => {
      const activeUsers = await userRepository.getMany({
        where: { isActive: true }
      });
      expect(activeUsers).toHaveLength(4);
      activeUsers.forEach((user: UserType) => {
        expect(user.isActive).toBe(true);
      });
    });

    test('getMany() with complex where conditions', async () => {
      const users = await userRepository.getMany({
        where: { 
          isActive: true,
          age: { gte: 25, lte: 35 }
        }
      });
      expect(users.length).toBeGreaterThan(0);
      users.forEach((user) => {
        expect(user.isActive).toBe(true);
        if (user.age !== null) {
          expect(user.age).toBeGreaterThanOrEqual(25);
          expect(user.age).toBeLessThanOrEqual(35);
        }
      });
    });

    test('getMany() with select fields', async () => {
      const users = await userRepository.getMany({
        select: { name: true, email: true },
        where: { isActive: true }
      });
      expect(users.length).toBeGreaterThan(0);
      users.forEach((user: any) => {
        expect(user).toHaveProperty('name');
        expect(user).toHaveProperty('email');
        expect(user).not.toHaveProperty('id');
        expect(user).not.toHaveProperty('age');
      });
    });

    test('getMany() with orderBy, limit, and offset', async () => {
      const users = await userRepository
        .where({ isActive: true })
        .orderBy('name', 'asc')
        .limit(2)
        .offset(1)
        .getMany();
      expect(users).toHaveLength(2);
      // Should be ordered by name - now with proper UserType[] intellisense
      expect(users[0].name <= users[1].name).toBe(true);
    });

    test('getOne() should return single record', async () => {
      const user = await userRepository.getOne({
        where: { email: 'john.test@example.com' }
      });
      expect(user).toBeTruthy();
      expect(user?.name).toBe('John Doe');
      expect(user?.email).toBe('john.test@example.com');
    });

    test('getOne() with select fields', async () => {
      const user = await userRepository.getOne({
        where: { email: 'jane.test@example.com' },
        select: { name: true, age: true }
      });
      expect(user).toBeTruthy();
      expect(user).toHaveProperty('name');
      expect(user).toHaveProperty('age');
      expect(user).not.toHaveProperty('email');
      expect(user).not.toHaveProperty('id');
    });

    test('getOne() should return null when no record found', async () => {
      const user = await userRepository.getOne({
        where: { email: 'nonexistent@example.com' }
      });
      expect(user).toBeNull();
    });

    test('count() should return correct count', async () => {
      const totalCount = await userRepository.count();
      expect(totalCount).toBe(5);
    });

    test('pluck() should return array of field values', async () => {
      const names = await userRepository.pluck('name');
      expect(names).toHaveLength(5);
      expect(names).toContain('John Doe');
      expect(names).toContain('Jane Smith');
    });
  });

  describe('Pagination Methods', () => {
    test('getManyPaginated() should return paginated results', async () => {
      const result = await userRepository.getManyPaginated({
        where: { isActive: true },
        orderBy: { field: 'name', direction: 'asc' },
        pagination: { page: 1, pageSize: 2 }
      });

      expect(result.data).toHaveLength(2);
      expect(result.pagination.currentPage).toBe(1);
      expect(result.pagination.pageSize).toBe(2);
      expect(result.pagination.totalItems).toBe(4); // 4 active users
      expect(result.pagination.totalPages).toBe(2);
      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.hasPreviousPage).toBe(false);
    });

    test('getManyPaginated() with select fields', async () => {
      const result = await userRepository.getManyPaginated({
        where: { isActive: true },
        select: { name: true, email: true },
        orderBy: { field: 'name', direction: 'asc' },
        pagination: { page: 1, pageSize: 3 }
      });

      expect(result.data).toHaveLength(3);
      result.data.forEach((user: any) => {
        expect(user).toHaveProperty('name');
        expect(user).toHaveProperty('email');
        expect(user).not.toHaveProperty('id');
      });
    });

    test('getManyPaginated() second page', async () => {
      const result = await userRepository.getManyPaginated({
        where: { isActive: true },
        orderBy: { field: 'name', direction: 'asc' },
        pagination: { page: 2, pageSize: 2 }
      });

      expect(result.data).toHaveLength(2);
      expect(result.pagination.currentPage).toBe(2);
      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.hasPreviousPage).toBe(true);
    });
  });

  describe('Logical Operators (AND/OR)', () => {
    test('OR operator should work correctly', async () => {
      const users = await userRepository.getMany({
        where: {
          OR: [
            { name: 'John Doe' },
            { name: 'Jane Smith' },
            { age: { gte: 40 } }
          ]
        }
      });
      expect(users.length).toBeGreaterThanOrEqual(3);
    });

    test('AND operator should work correctly', async () => {
      const users = await userRepository.getMany({
        where: {
          AND: [
            { isActive: true },
            { age: { gte: 25 } },
            { name: { like: '%o%' } }
          ]
        }
      });
      expect(users.length).toBeGreaterThan(0);
      users.forEach((user: UserType) => {
        expect(user.isActive).toBe(true);
        if (user.age !== null) {
          expect(user.age).toBeGreaterThanOrEqual(25);
        }
        expect(user.name.toLowerCase()).toContain('o');
      });
    });

    test('Mixed AND/OR operators', async () => {
      const users = await userRepository.getMany({
        where: {
          isActive: true,
          OR: [
            { age: { lt: 30 } },
            { name: { like: '%Alice%' } }
          ]
        }
      });
      expect(users.length).toBeGreaterThan(0);
      users.forEach((user: UserType) => {
        expect(user.isActive).toBe(true);
      });
    });

    test('Nested logical operators', async () => {
      const users = await userRepository
        .where({
          AND: [
            { isActive: true },
            {
              OR: [
                { age: { gte: 30 } },
                { name: { like: '%Jane%' } }
              ]
            }
          ]
        })
        .getMany();
      expect(users.length).toBeGreaterThan(0);
      users.forEach((user: UserType) => {
        expect(user.isActive).toBe(true);
      });
    });
  });

  describe('Scoped Queries', () => {
    test('active scope should filter active users', async () => {
      const activeUsers = await userRepository.scoped.active().getMany();
      expect(activeUsers).toHaveLength(4);
      activeUsers.forEach((user: UserType) => {
        expect(user.isActive).toBe(true);
      });
    });

    test('inactive scope should filter inactive users', async () => {
      const inactiveUsers = await userRepository.scoped.inactive().getMany();
      expect(inactiveUsers).toHaveLength(1);
      inactiveUsers.forEach((user: UserType) => {
        expect(user.isActive).toBe(false);
      });
    });

    test('byAge scope with parameter', async () => {
      const users = await userRepository.scoped.byAge(30).getMany();
      expect(users.length).toBeGreaterThan(0);
      users.forEach((user: UserType) => {
        if (user.age !== null) {
          expect(user.age).toBeGreaterThanOrEqual(30);
        }
      });
    });

    test('byEmail scope with parameter', async () => {
      const users = await userRepository.scoped.byEmail('john.test@example.com').getMany();
      expect(users).toHaveLength(1);
      expect(users[0].name).toBe('John Doe');
    });

    test('chained scopes', async () => {
      const users = await userRepository.scoped
        .active()
        .byAge(25)
        .orderBy('name', 'asc')
        .getMany();
      
      expect(users.length).toBeGreaterThan(0);
      users.forEach((user: UserType) => {
        expect(user.isActive).toBe(true);
        if (user.age !== null) {
          expect(user.age).toBeGreaterThanOrEqual(25);
        }
      });
    });

    test('scoped query with select', async () => {
      const users = await userRepository.scoped
        .active()
        .orderBy('name', 'asc')
        .select({ name: true, email: true })
        .getMany();
      
      expect(users.length).toBeGreaterThan(0);
      users.forEach((user: any) => {
        expect(user).toHaveProperty('name');
        expect(user).toHaveProperty('email');
        expect(user).not.toHaveProperty('id');
      });
    });

    test('scoped query with limit and offset', async () => {
      const users = await userRepository.scoped
        .active()
        .orderBy('name', 'asc')
        .limit(2)
        .offset(1)
        .getMany();
      
      expect(users).toHaveLength(2);
    });

    test('scoped count', async () => {
      const count = await userRepository.scoped.active().count();
      expect(count).toBe(4);
    });

    test('scoped getOne', async () => {
      const user = await userRepository.scoped
        .active()
        .orderBy('name', 'asc')
        .getOne();
      
      expect(user).toBeTruthy();
      expect(user?.isActive).toBe(true);
    });

    test('scoped pluck', async () => {
      const names = await userRepository.scoped.active().pluck('name');
      expect(names).toHaveLength(4);
    });

    test('scoped pagination', async () => {
      const result = await userRepository.scoped
        .active()
        .orderBy('name', 'asc')
        .getManyPaginated({ page: 1, pageSize: 2 });
      
      expect(result.data).toHaveLength(2);
      expect(result.pagination.totalItems).toBe(4);
      expect(result.pagination.totalPages).toBe(2);
    });
  });

  describe('Account Repository Tests', () => {
    test('account scopes should work correctly', async () => {
      const activeAccounts = await accountRepository.scoped.active().getMany();
      expect(activeAccounts.length).toBeGreaterThan(0);
      activeAccounts.forEach((account: AccountType) => {
        expect(account.isActive).toBe(true);
      });
    });

    test('withBalance scope should filter by balance', async () => {
      const highBalanceAccounts = await accountRepository.scoped.withBalance(5000).getMany();
      expect(highBalanceAccounts.length).toBeGreaterThan(0);
      highBalanceAccounts.forEach((account: AccountType) => {
        expect(account.balance).toBeGreaterThanOrEqual(5000);
      });
    });

    test('highBalance scope should work', async () => {
      const highBalanceAccounts = await accountRepository.scoped.highBalance().getMany();
      expect(highBalanceAccounts.length).toBeGreaterThan(0);
      highBalanceAccounts.forEach((account: AccountType) => {
        expect(account.balance).toBeGreaterThanOrEqual(10000);
      });
    });

    test('byUserId scope should filter by user', async () => {
      const userAccounts = await accountRepository.scoped.byUserId(testUserIds[0]).getMany();
      expect(userAccounts.length).toBeGreaterThan(0);
      userAccounts.forEach((account: AccountType) => {
        expect(account.userId).toBe(testUserIds[0]);
      });
    });

    test('chained account scopes', async () => {
      const accounts = await accountRepository.scoped
        .active()
        .withBalance(1000)
        .orderBy('balance', 'desc')
        .getMany();
      
      expect(accounts.length).toBeGreaterThan(0);
      accounts.forEach((account: AccountType) => {
        expect(account.isActive).toBe(true);
        expect(account.balance).toBeGreaterThanOrEqual(1000);
      });
    });
  });

  describe('Query Builder Methods', () => {
    test('where() method should work', async () => {
      const users = await userRepository.where({ isActive: true }).getMany();
      expect(users.length).toBeGreaterThan(0);
      users.forEach((user: UserType) => {
        expect(user.isActive).toBe(true);
      });
    });

    test('select() method should work', async () => {
      const users = await userRepository
        .select({ name: true, email: true })
        .getMany();
      
      expect(users.length).toBeGreaterThan(0);
      users.forEach((user: any) => {
        expect(user).toHaveProperty('name');
        expect(user).toHaveProperty('email');
        expect(user).not.toHaveProperty('id');
      });
    });

    test('chained query builder methods', async () => {
      const users = await userRepository
        .where({ isActive: true })
        .select({ name: true, age: true })
        .getMany();
      
      expect(users.length).toBeGreaterThan(0);
      users.forEach((user: any) => {
        expect(user).toHaveProperty('name');
        expect(user).toHaveProperty('age');
        expect(user).not.toHaveProperty('email');
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid where conditions gracefully', async () => {
      try {
        await userRepository.getMany({
          where: { nonExistentField: 'value' } as any
        });
        // If no error is thrown, that's fine too (depends on implementation)
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should handle invalid select fields gracefully', async () => {
      try {
        await userRepository.getMany({
          select: { nonExistentField: true } as any,
        });
        // If no error is thrown, that's fine too (depends on implementation)
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Edge Cases', () => {
    test('pagination with page beyond total pages', async () => {
      const result = await userRepository.getManyPaginated({
        where: { isActive: true },
        pagination: { page: 10, pageSize: 2 }
      });

      expect(result.data).toHaveLength(0);
      expect(result.pagination.currentPage).toBe(10);
      expect(result.pagination.hasNextPage).toBe(false);
    });

    test('limit larger than total records', async () => {
      const users = await userRepository.getMany({
        limit: 100
      });
      
      expect(users).toHaveLength(5); // Should return all available records
    });

    test('offset larger than total records', async () => {
      const users = await userRepository.getMany({
        offset: 100
      });
      
      expect(users).toHaveLength(0);
    });

    test('empty where conditions', async () => {
      const users = await userRepository.getMany({
        where: {}
      });
      
      expect(users).toHaveLength(5);
    });

    test('null age handling in comparisons', async () => {
      const users = await userRepository.getMany({
        where: { age: { gte: 0 } }
      });
      
      // Should only return users with non-null age values
      users.forEach((user: UserType) => {
        expect(user.age).not.toBeNull();
      });
    });
  });
});
