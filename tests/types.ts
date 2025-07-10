/**
 * Test Types and Repository Definitions
 *
 * This file defines all the types, models, and repositories used in tests
 * with proper type annotations for better type safety.
 */

import {
  defineModel,
  createRepository,
  PostgreSQLAdapter,
  text,
  uuid,
  integer,
  boolean,
  timestamp,
  nullable,
  QueryBuilder,
  RepositoryType,
  hasOne,
  hasMany,
  belongsTo,
  belongsToMany,
} from "../src/index";

// Define entity types
export interface UserType {
  id: string;
  name: string;
  email: string;
  age: number | null;
  isActive: boolean;
  createdAt: Date;
}

export interface AccountType {
  id: string;
  name: string;
  userId: string;
  balance: number;
  isActive: boolean;
  createdAt: Date;
}

// Additional types for complex relations testing
export interface ProfileType {
  id: string;
  userId: string;
  bio: string | null;
  website: string | null;
  avatar: string | null;
  createdAt: Date;
}

export interface PostType {
  id: string;
  title: string;
  content: string;
  userId: string;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommentType {
  id: string;
  content: string;
  postId: string;
  userId: string;
  parentCommentId: string | null;
  createdAt: Date;
}

export interface CategoryType {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
}

export interface UserCategoryType {
  id: string;
  userId: string;
  categoryId: string;
  joinedAt: Date;
}

export interface TagType {
  id: string;
  name: string;
  color: string | null;
  createdAt: Date;
}

export interface PostTagType {
  id: string;
  postId: string;
  tagId: string;
  createdAt: Date;
}

// Define models
export const User = defineModel<UserType>("test_users", {
  table: "test_users",
  fields: {
    id: uuid({ primaryKey: true }),
    name: text(),
    email: text({ unique: true }),
    age: nullable.integer(),
    isActive: boolean({ default: true }),
    createdAt: timestamp(),
  },
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

export const Account = defineModel<AccountType>("test_accounts", {
  table: "test_accounts",
  fields: {
    id: uuid({ primaryKey: true }),
    name: text(),
    userId: uuid(),
    balance: integer({ default: 0 }),
    isActive: boolean({ default: true }),
    createdAt: timestamp(),
  },
  relations: {
    user: belongsTo("test_users", "userId"),
  },
});

// Profile model (one-to-one with User)
export const Profile = defineModel<ProfileType>("test_profiles", {
  table: "test_profiles",
  fields: {
    id: uuid({ primaryKey: true }),
    userId: uuid({ unique: true }),
    bio: nullable.text(),
    website: nullable.text(),
    avatar: nullable.text(),
    createdAt: timestamp(),
  },
  relations: {
    user: belongsTo("test_users", "userId"),
  },
});

// Post model (many-to-one with User)
export const Post = defineModel<PostType>("test_posts", {
  table: "test_posts",
  fields: {
    id: uuid({ primaryKey: true }),
    title: text(),
    content: text(),
    userId: uuid(),
    published: boolean({ default: false }),
    createdAt: timestamp(),
    updatedAt: timestamp(),
  },
  relations: {
    user: belongsTo("test_users", "userId"),
    comments: hasMany("test_comments", "postId"),
    tags: belongsToMany("test_tags", "test_post_tags", "postId", "tagId"),
  },
});

// Comment model (nested one-to-many with Post and self-referencing)
export const Comment = defineModel<CommentType>("test_comments", {
  table: "test_comments",
  fields: {
    id: uuid({ primaryKey: true }),
    content: text(),
    postId: uuid(),
    userId: uuid(),
    parentCommentId: nullable.uuid(),
    createdAt: timestamp(),
  },
  relations: {
    post: belongsTo("test_posts", "postId"),
    user: belongsTo("test_users", "userId"),
    parentComment: belongsTo("test_comments", "parentCommentId"),
    replies: hasMany("test_comments", "parentCommentId"),
  },
});

// Category model (many-to-many with User)
export const Category = defineModel<CategoryType>("test_categories", {
  table: "test_categories",
  fields: {
    id: uuid({ primaryKey: true }),
    name: text({ unique: true }),
    description: nullable.text(),
    createdAt: timestamp(),
  },
  relations: {
    users: belongsToMany(
      "test_users",
      "test_user_categories",
      "categoryId",
      "userId"
    ),
  },
});

// UserCategory pivot model
export const UserCategory = defineModel<UserCategoryType>("test_user_categories", {
  table: "test_user_categories",
  fields: {
    id: uuid({ primaryKey: true }),
    userId: uuid(),
    categoryId: uuid(),
    joinedAt: timestamp(),
  },
  relations: {
    user: belongsTo("test_users", "userId"),
    category: belongsTo("test_categories", "categoryId"),
  },
});

// Tag model (many-to-many with Post)
export const Tag = defineModel<TagType>("test_tags", {
  table: "test_tags",
  fields: {
    id: uuid({ primaryKey: true }),
    name: text({ unique: true }),
    color: nullable.text(),
    createdAt: timestamp(),
  },
  relations: {
    posts: belongsToMany("test_posts", "test_post_tags", "tagId", "postId"),
  },
});

// PostTag pivot model
export const PostTag = defineModel<PostTagType>("test_post_tags", {
  table: "test_post_tags",
  fields: {
    id: uuid({ primaryKey: true }),
    postId: uuid(),
    tagId: uuid(),
    createdAt: timestamp(),
  },
  relations: {
    post: belongsTo("test_posts", "postId"),
    tag: belongsTo("test_tags", "tagId"),
  },
});

// Define repository scopes
export const userScopes = {
  active: () => (qb: QueryBuilder<UserType>) => qb.andWhere({ isActive: true }),
  byAge: (minAge: number) => (qb: QueryBuilder<UserType>) =>
    qb.andWhere({ age: { gte: minAge } }),
  byEmail: (email: string) => (qb: QueryBuilder<UserType>) =>
    qb.andWhere({ email }),
  inactive: () => (qb: QueryBuilder<UserType>) =>
    qb.andWhere({ isActive: false }),
};

export const accountScopes = {
  active: () => (qb: QueryBuilder<AccountType>) =>
    qb.andWhere({ isActive: true }),
  byUserId: (userId: string) => (qb: QueryBuilder<AccountType>) =>
    qb.andWhere({ userId }),
  withBalance: (minBalance: number) => (qb: QueryBuilder<AccountType>) =>
    qb.andWhere({ balance: { gte: minBalance } }),
  highBalance: () => (qb: QueryBuilder<AccountType>) =>
    qb.andWhere({ balance: { gte: 10000 } }),
};

export const profileScopes = {
  withBio: () => (qb: QueryBuilder<ProfileType>) =>
    qb.andWhere({ bio: { isNotNull: true } }),
  withWebsite: () => (qb: QueryBuilder<ProfileType>) =>
    qb.andWhere({ website: { isNotNull: true } }),
  byUserId: (userId: string) => (qb: QueryBuilder<ProfileType>) =>
    qb.andWhere({ userId }),
};

export const postScopes = {
  published: () => (qb: QueryBuilder<PostType>) =>
    qb.andWhere({ published: true }),
  draft: () => (qb: QueryBuilder<PostType>) =>
    qb.andWhere({ published: false }),
  byUserId: (userId: string) => (qb: QueryBuilder<PostType>) =>
    qb.andWhere({ userId }),
  recent:
    (days: number = 7) =>
    (qb: QueryBuilder<PostType>) =>
      qb.andWhere({
        createdAt: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
      }),
  byTitle: (title: string) => (qb: QueryBuilder<PostType>) =>
    qb.andWhere({ title: { like: `%${title}%` } }),
};

export const commentScopes = {
  byPostId: (postId: string) => (qb: QueryBuilder<CommentType>) =>
    qb.andWhere({ postId }),
  byUserId: (userId: string) => (qb: QueryBuilder<CommentType>) =>
    qb.andWhere({ userId }),
  topLevel: () => (qb: QueryBuilder<CommentType>) =>
    qb.andWhere({ parentCommentId: { isNull: true } }),
  replies: (parentCommentId: string) => (qb: QueryBuilder<CommentType>) =>
    qb.andWhere({ parentCommentId }),
  recent:
    (hours: number = 24) =>
    (qb: QueryBuilder<CommentType>) =>
      qb.andWhere({
        createdAt: { gte: new Date(Date.now() - hours * 60 * 60 * 1000) },
      }),
};

export const categoryScopes = {
  byName: (name: string) => (qb: QueryBuilder<CategoryType>) =>
    qb.andWhere({ name: { like: `%${name}%` } }),
  withDescription: () => (qb: QueryBuilder<CategoryType>) =>
    qb.andWhere({ description: { isNotNull: true } }),
};

export const tagScopes = {
  byName: (name: string) => (qb: QueryBuilder<TagType>) =>
    qb.andWhere({ name: { like: `%${name}%` } }),
  byColor: (color: string) => (qb: QueryBuilder<TagType>) =>
    qb.andWhere({ color }),
  withColor: () => (qb: QueryBuilder<TagType>) =>
    qb.andWhere({ color: { isNotNull: true } }),
};

export const userCategoryScopes = {
  byUserId: (userId: string) => (qb: QueryBuilder<UserCategoryType>) =>
    qb.andWhere({ userId }),
  byCategoryId: (categoryId: string) => (qb: QueryBuilder<UserCategoryType>) =>
    qb.andWhere({ categoryId }),
  recentJoins:
    (days: number = 30) =>
    (qb: QueryBuilder<UserCategoryType>) =>
      qb.andWhere({
        joinedAt: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
      }),
};

export const postTagScopes = {
  byPostId: (postId: string) => (qb: QueryBuilder<PostTagType>) =>
    qb.andWhere({ postId }),
  byTagId: (tagId: string) => (qb: QueryBuilder<PostTagType>) =>
    qb.andWhere({ tagId }),
};

// Define repository types
export type UserRepository = RepositoryType<UserType, typeof userScopes>;
export type AccountRepository = RepositoryType<
  AccountType,
  typeof accountScopes
>;
export type ProfileRepository = RepositoryType<
  ProfileType,
  typeof profileScopes
>;
export type PostRepository = RepositoryType<PostType, typeof postScopes>;
export type CommentRepository = RepositoryType<
  CommentType,
  typeof commentScopes
>;
export type CategoryRepository = RepositoryType<
  CategoryType,
  typeof categoryScopes
>;
export type TagRepository = RepositoryType<TagType, typeof tagScopes>;
export type UserCategoryRepository = RepositoryType<
  UserCategoryType,
  typeof userCategoryScopes
>;
export type PostTagRepository = RepositoryType<
  PostTagType,
  typeof postTagScopes
>;

// Repository factory functions with proper types
export function createUserRepository(
  dbAdapter: PostgreSQLAdapter
): UserRepository {
  return createRepository(User, {
    scopes: userScopes,
    executor: dbAdapter,
  });
}

export function createAccountRepository(
  dbAdapter: PostgreSQLAdapter
): AccountRepository {
  return createRepository(Account, {
    scopes: accountScopes,
    executor: dbAdapter,
  });
}

export function createProfileRepository(
  dbAdapter: PostgreSQLAdapter
): ProfileRepository {
  return createRepository(Profile, {
    scopes: profileScopes,
    executor: dbAdapter,
  });
}

export function createPostRepository(
  dbAdapter: PostgreSQLAdapter
): PostRepository {
  return createRepository(Post, {
    scopes: postScopes,
    executor: dbAdapter,
  });
}

export function createCommentRepository(
  dbAdapter: PostgreSQLAdapter
): CommentRepository {
  return createRepository(Comment, {
    scopes: commentScopes,
    executor: dbAdapter,
  });
}

export function createCategoryRepository(
  dbAdapter: PostgreSQLAdapter
): CategoryRepository {
  return createRepository(Category, {
    scopes: categoryScopes,
    executor: dbAdapter,
  });
}

export function createTagRepository(
  dbAdapter: PostgreSQLAdapter
): TagRepository {
  return createRepository(Tag, {
    scopes: tagScopes,
    executor: dbAdapter,
  });
}

export function createUserCategoryRepository(
  dbAdapter: PostgreSQLAdapter
): UserCategoryRepository {
  return createRepository(UserCategory, {
    scopes: userCategoryScopes,
    executor: dbAdapter,
  });
}

export function createPostTagRepository(
  dbAdapter: PostgreSQLAdapter
): PostTagRepository {
  return createRepository(PostTag, {
    scopes: postTagScopes,
    executor: dbAdapter,
  });
}

// Combined factory function
export function createTestRepositories(dbAdapter: PostgreSQLAdapter) {
  const userRepository = createUserRepository(dbAdapter);
  const accountRepository = createAccountRepository(dbAdapter);
  const profileRepository = createProfileRepository(dbAdapter);
  const postRepository = createPostRepository(dbAdapter);
  const commentRepository = createCommentRepository(dbAdapter);
  const categoryRepository = createCategoryRepository(dbAdapter);
  const tagRepository = createTagRepository(dbAdapter);
  const userCategoryRepository = createUserCategoryRepository(dbAdapter);
  const postTagRepository = createPostTagRepository(dbAdapter);

  return {
    userRepository,
    accountRepository,
    profileRepository,
    postRepository,
    commentRepository,
    categoryRepository,
    tagRepository,
    userCategoryRepository,
    postTagRepository,
  };
}

// Export types for external use
export type TestRepositories = ReturnType<typeof createTestRepositories>;

// Helper types for testing complex relations
export type UserWithRelations = UserType & {
  profile?: ProfileType;
  accounts?: AccountType[];
  posts?: PostType[];
  comments?: CommentType[];
  categories?: CategoryType[];
};

export type PostWithRelations = PostType & {
  user?: UserType;
  comments?: CommentType[];
  tags?: TagType[];
};

export type CommentWithRelations = CommentType & {
  post?: PostType;
  user?: UserType;
  parentComment?: CommentType;
  replies?: CommentType[];
};

export type CategoryWithRelations = CategoryType & {
  users?: UserType[];
};

export type TagWithRelations = TagType & {
  posts?: PostType[];
};

// Test data factory functions
export function createTestUser(
  overrides: Partial<UserType> = {}
): Omit<UserType, "id" | "createdAt"> {
  return {
    name: "Test User",
    email: "test@example.com",
    age: 25,
    isActive: true,
    ...overrides,
  };
}

export function createTestPost(
  userId: string,
  overrides: Partial<PostType> = {}
): Omit<PostType, "id" | "createdAt" | "updatedAt"> {
  return {
    title: "Test Post",
    content: "This is a test post content",
    userId,
    published: true,
    ...overrides,
  };
}

export function createTestComment(
  postId: string,
  userId: string,
  overrides: Partial<CommentType> = {}
): Omit<CommentType, "id" | "createdAt"> {
  return {
    content: "Test comment content",
    postId,
    userId,
    parentCommentId: null,
    ...overrides,
  };
}

export function createTestCategory(
  overrides: Partial<CategoryType> = {}
): Omit<CategoryType, "id" | "createdAt"> {
  return {
    name: "Test Category",
    description: "Test category description",
    ...overrides,
  };
}

export function createTestTag(
  overrides: Partial<TagType> = {}
): Omit<TagType, "id" | "createdAt"> {
  return {
    name: "test-tag",
    color: "#FF0000",
    ...overrides,
  };
}

export function createTestProfile(
  userId: string,
  overrides: Partial<ProfileType> = {}
): Omit<ProfileType, "id" | "createdAt"> {
  return {
    userId,
    bio: "Test user bio",
    website: "https://example.com",
    avatar: "https://example.com/avatar.jpg",
    ...overrides,
  };
}
