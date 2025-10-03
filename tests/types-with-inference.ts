/**
 * Test Types and Repository Definitions - WITH TYPE INFERENCE
 *
 * This file demonstrates the new automatic type inference feature.
 * No need to manually define UserType, AccountType, etc.
 */

import {
  defineModel,
  createRepository,
  text,
  uuid,
  integer,
  boolean,
  timestamp,
  nullable,
  QueryBuilder,
  hasOne,
  hasMany,
  belongsTo,
  belongsToMany,
  InferEntityType,
} from "../src/index";

// ============================================
// Define Fields (the source of truth)
// ============================================

const userFields = {
  id: uuid({ primaryKey: true }),
  name: text(),
  email: text({ unique: true }),
  age: nullable.integer(),
  isActive: boolean({ default: true }),
  createdAt: timestamp(),
} as const;

const accountFields = {
  id: uuid({ primaryKey: true }),
  name: text(),
  userId: uuid(),
  balance: integer({ default: 0 }),
  isActive: boolean({ default: true }),
  createdAt: timestamp(),
} as const;

const profileFields = {
  id: uuid({ primaryKey: true }),
  userId: uuid({ unique: true }),
  bio: nullable.text(),
  website: nullable.text(),
  avatar: nullable.text(),
  createdAt: timestamp(),
} as const;

const postFields = {
  id: uuid({ primaryKey: true }),
  title: text(),
  content: text(),
  userId: uuid(),
  published: boolean({ default: false }),
  createdAt: timestamp(),
  updatedAt: timestamp(),
} as const;

const commentFields = {
  id: uuid({ primaryKey: true }),
  content: text(),
  postId: uuid(),
  userId: uuid(),
  parentCommentId: nullable.uuid(),
  createdAt: timestamp(),
} as const;

const categoryFields = {
  id: uuid({ primaryKey: true }),
  name: text(),
  description: nullable.text(),
  createdAt: timestamp(),
} as const;

const userCategoryFields = {
  id: uuid({ primaryKey: true }),
  userId: uuid(),
  categoryId: uuid(),
  joinedAt: timestamp(),
} as const;

const tagFields = {
  id: uuid({ primaryKey: true }),
  name: text(),
  color: nullable.text(),
  createdAt: timestamp(),
} as const;

const postTagFields = {
  id: uuid({ primaryKey: true }),
  postId: uuid(),
  tagId: uuid(),
  createdAt: timestamp(),
} as const;

// ============================================
// Automatically Infer Types (No manual definition needed!)
// ============================================


// ============================================
// Define Models
// ============================================

export const User = defineModel("test_users", {
  table: "test_users",
  fields: userFields,
  relations: {
    profile: hasOne("test_profiles", "userId"),
    accounts: hasMany("test_accounts", "userId"),
    posts: hasMany("test_posts", "userId"),
    comments: hasMany("test_comments", "userId"),
    categories: belongsToMany(
      "test_categories",
      "test_user_categories",
      "userId",
      "categoryId"
    ),
  },
});

export const Account = defineModel("test_accounts", {
  table: "test_accounts",
  fields: accountFields,
  relations: {
    user: belongsTo("test_users", "userId"),
  },
});

export const Profile = defineModel("test_profiles", {
  table: "test_profiles",
  fields: profileFields,
  relations: {
    user: belongsTo("test_users", "userId"),
  },
});

export const Post = defineModel("test_posts", {
  table: "test_posts",
  fields: postFields,
  relations: {
    user: belongsTo("test_users", "userId"),
    comments: hasMany("test_comments", "postId"),
    tags: belongsToMany("test_tags", "test_post_tags", "postId", "tagId"),
  },
});

export const Comment = defineModel("test_comments", {
  table: "test_comments",
  fields: commentFields,
  relations: {
    post: belongsTo("test_posts", "postId"),
    user: belongsTo("test_users", "userId"),
    parentComment: belongsTo("test_comments", "parentCommentId"),
    replies: hasMany("test_comments", "parentCommentId"),
  },
});

export const Category = defineModel("test_categories", {
  table: "test_categories",
  fields: categoryFields,
  relations: {
    users: belongsToMany(
      "test_users",
      "test_user_categories",
      "categoryId",
      "userId"
    ),
  },
});

export const UserCategory = defineModel("test_user_categories", {
  table: "test_user_categories",
  fields: userCategoryFields,
  relations: {
    user: belongsTo("test_users", "userId"),
    category: belongsTo("test_categories", "categoryId"),
  },
});

export const Tag = defineModel("test_tags", {
  table: "test_tags",
  fields: tagFields,
  relations: {
    posts: belongsToMany("test_posts", "test_post_tags", "tagId", "postId"),
  },
});

export const PostTag = defineModel("test_post_tags", {
  table: "test_post_tags",
  fields: postTagFields,
  relations: {
    post: belongsTo("test_posts", "postId"),
    tag: belongsTo("test_tags", "tagId"),
  },
});

export type UserType = InferEntityType<typeof userFields>;
export type AccountType = InferEntityType<typeof accountFields>;
export type ProfileType = InferEntityType<typeof profileFields>;
export type PostType = InferEntityType<typeof postFields>;
export type CommentType = InferEntityType<typeof commentFields>;
export type CategoryType = InferEntityType<typeof categoryFields>;
export type UserCategoryType = InferEntityType<typeof userCategoryFields>;
export type TagType = InferEntityType<typeof tagFields>;
export type PostTagType = InferEntityType<typeof postTagFields>;

// ============================================
// Type Verification Examples
// ============================================

// TypeScript knows all the types automatically!
export const exampleUsage = async () => {
  // ✅ All these have full type safety and autocomplete
  const users = await User.getMany();
  users.forEach((user) => {
    console.log(user.id); // string
    console.log(user.name); // string
    console.log(user.email); // string
    console.log(user.age); // number | null
    console.log(user.isActive); // boolean
    console.log(user.createdAt); // Date
  });

  // ✅ Update with type checking
  await User.where({ id: "123" }).update({
    name: "New Name",
    age: 30,
  });

  // ❌ This would cause a TypeScript error:
  // await User.where({ id: "123" }).update({
  //   name: 123, // Error: Type 'number' is not assignable to type 'string'
  // });
};

// ============================================
// Create Repositories with Scopes
// ============================================

export const userRepository = createRepository(User, {
  scopes: {
    activeUsers: () => (qb: QueryBuilder<UserType>) =>
      qb.where({ isActive: true }),
    
    usersByEmail: (email: string) => (qb: QueryBuilder<UserType>) =>
      qb.where({ email }),
    
    recentUsers: (days: number = 7) => (qb: QueryBuilder<UserType>) => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      return qb.where({ createdAt: { gte: cutoffDate } });
    },
  },
  executor: {} as any, // Will be set in test setup
});

export const accountRepository = createRepository(Account, {
  scopes: {
    activeAccounts: () => (qb: QueryBuilder<AccountType>) =>
      qb.where({ isActive: true }),
    
    accountsByUser: (userId: string) => (qb: QueryBuilder<AccountType>) =>
      qb.where({ userId }),
  },
  executor: {} as any, // Will be set in test setup
});

export const postRepository = createRepository(Post, {
  scopes: {
    publishedPosts: () => (qb: QueryBuilder<PostType>) =>
      qb.where({ published: true }),
    
    draftPosts: () => (qb: QueryBuilder<PostType>) =>
      qb.where({ published: false }),
    
    postsByUser: (userId: string) => (qb: QueryBuilder<PostType>) =>
      qb.where({ userId }),
  },
  executor: {} as any, // Will be set in test setup
});

// ============================================
// Export Repository Types
// ============================================

export type UserRepositoryType = typeof userRepository;
export type AccountRepositoryType = typeof accountRepository;
export type PostRepositoryType = typeof postRepository;

