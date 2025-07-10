import { 
  defineModel, 
  createRepository, 
  PostgreSQLAdapter, 
  setGlobalExecutor,
  text, 
  uuid, 
  nullable 
} from '../src/index';

// Define explicit types for better type safety
interface UserType {
  id: string;
  name: string;
  email: string;
  age: number | null;
}

// Define models with explicit types
const User = defineModel<UserType>({
  table: 'users',
  fields: {
    id: uuid({ primaryKey: true }),
    name: text(),
    email: text({ unique: true }),
    age: nullable.integer(),
  }
});


// Configure database connection
const dbAdapter = new PostgreSQLAdapter({
  host: 'localhost',
  port: 5432,
  database: 'drizzle',
  user: 'postgres',
  password: 'postgres'
});

// Set global executor
setGlobalExecutor(dbAdapter);

// Create repositories with scopes
export const userRepository = createRepository<UserType>(User, {
  scopes: {
    byAge: (minAge: number) => (qb) => qb.where({ age: { gte: minAge } }),
    byEmail: (email: string) => (qb) => qb.where({ email }),
  },
  executor: dbAdapter
});


async function demonstrateQuerio() {
  console.log('🚀 Querio ORM Demonstration');
  console.log('=============================\n');

  try {
    // Test connection
    const isConnected = await dbAdapter.testConnection();
    console.log(`Database connection: ${isConnected ? '✅ Connected' : '❌ Failed'}`);

    if (!isConnected) {
      console.log('Please ensure PostgreSQL is running and the database exists.');
      return;
    }

    // Example 1: Basic queries
    console.log('\n📝 Example 1: Basic Queries');
    console.log('----------------------------');

    // Get all users
    const allUsers = await User.select({
      id: true,
      name: true,
    }).getMany();

    console.log(allUsers[0])

  
    console.log('\n✅ Querio demonstration completed successfully!');

  } catch (error) {
    console.error('❌ Error during demonstration:', error);
  } finally {
    // Clean up
    await dbAdapter.close();
  }
}

// Run the demonstration
if (require.main === module) {
  demonstrateQuerio().catch(console.error);
}

export { demonstrateQuerio };
