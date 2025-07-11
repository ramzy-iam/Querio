/**
 * Complex Relations Integration Tests
 *
 * This file contains comprehensive tests for complex relationship scenarios:
 * - One-to-One (User -> Profile)
 * - One-to-Many (User -> Posts, Post -> Comments)
 * - Many-to-Many (User <-> Categories, Post <-> Tags)
 * - Nested Relations (User -> Posts -> Comments)
 * - Self-referencing Relations (Comment -> parent Comment)
 */

import { PostgreSQLAdapter, setGlobalExecutor } from "../src/index";
import {
  createTestRepositories,
  TestRepositories,
  createTestUser,
  createTestPost,
  createTestComment,
  createTestCategory,
  createTestTag,
  createTestProfile,
  UserWithRelations,
  PostWithRelations,
  CommentWithRelations,
} from "./types";

describe("Complex Relations Integration Tests", () => {
  let dbAdapter: PostgreSQLAdapter;
  let repositories: TestRepositories;

  beforeAll(async () => {
    dbAdapter = new PostgreSQLAdapter({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME || "querio_test",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
    });

    // Set global executor
    setGlobalExecutor(dbAdapter);
    repositories = createTestRepositories(dbAdapter);

    // Create test tables
    await createTestTables(dbAdapter);
  });

  afterAll(async () => {
    await cleanupTestTables(dbAdapter);
    await dbAdapter.close();
  });

  beforeEach(async () => {
    // Clean up data before each test
    await cleanupTestData(dbAdapter);
  });

  describe("Basic CRUD Operations", () => {
    test("should create and fetch user", async () => {
      const userData = createTestUser({
        name: "John Doe",
        email: "john@example.com",
      });
      const user = await repositories.userRepository.create(userData);

      expect(user.id).toBeDefined();
      expect(user.name).toBe("John Doe");
      expect(user.email).toBe("john@example.com");

      const foundUser = await repositories.userRepository.getOne({
        where: { id: user.id },
      });

      expect(foundUser).toBeDefined();
      expect(foundUser?.name).toBe("John Doe");
    });

    test("should create user with profile (one-to-one)", async () => {
      // Create user
      const userData = createTestUser({
        name: "Jane Doe",
        email: "jane@example.com",
      });
      const user = await repositories.userRepository.create(userData);

      // Create profile for user
      const profileData = createTestProfile(user.id, {
        bio: "Software developer and coffee enthusiast",
        website: "https://janedoe.dev",
      });
      const profile = await repositories.profileRepository.create(profileData);

      expect(profile.id).toBeDefined();
      expect(profile.userId).toBe(user.id);
      expect(profile.bio).toBe("Software developer and coffee enthusiast");

      // Verify profile belongs to user
      const foundProfile = await repositories.profileRepository.getOne({
        where: { userId: user.id },
      });

      expect(foundProfile).toBeDefined();
      expect(foundProfile?.bio).toBe(
        "Software developer and coffee enthusiast"
      );
    });

    test("should create user with multiple posts (one-to-many)", async () => {
      // Create user
      const userData = createTestUser({
        name: "Blog Author",
        email: "author@blog.com",
      });
      const user = await repositories.userRepository.create(userData);

      // Create multiple posts
      const post1Data = createTestPost(user.id, {
        title: "First Post",
        content: "Content of first post",
      });
      const post2Data = createTestPost(user.id, {
        title: "Second Post",
        content: "Content of second post",
        published: false,
      });

      await repositories.postRepository.create(post1Data);
      await repositories.postRepository.create(post2Data);

      // Fetch posts by user
      const userPosts = await repositories.postRepository.getMany({
        where: { userId: user.id },
      });

      expect(userPosts).toHaveLength(2);
      expect(userPosts.map((p) => p.title)).toContain("First Post");
      expect(userPosts.map((p) => p.title)).toContain("Second Post");
    });

    test("should create nested post comments", async () => {
      // Create user and post
      const userData = createTestUser({
        name: "Commenter",
        email: "commenter@example.com",
      });
      const user = await repositories.userRepository.create(userData);

      const postData = createTestPost(user.id, {
        title: "Post for Comments",
      });
      const post = await repositories.postRepository.create(postData);

      // Create parent comment
      const parentCommentData = createTestComment(post.id, user.id, {
        content: "Parent comment",
      });
      const parentComment = await repositories.commentRepository.create(
        parentCommentData
      );

      // Create reply comments
      const reply1Data = createTestComment(post.id, user.id, {
        content: "First reply",
        parentCommentId: parentComment.id,
      });
      const reply2Data = createTestComment(post.id, user.id, {
        content: "Second reply",
        parentCommentId: parentComment.id,
      });

      await repositories.commentRepository.create(reply1Data);
      await repositories.commentRepository.create(reply2Data);

      // Test scoped queries - top-level comments
      const topLevelComments = await repositories.commentRepository.scoped
        .topLevel()
        .byPostId(post.id)
        .getMany();

      expect(topLevelComments).toHaveLength(1);
      expect(topLevelComments[0].content).toBe("Parent comment");

      // Test scoped queries - replies
      const replies = await repositories.commentRepository.scoped
        .replies(parentComment.id)
        .getMany();

      expect(replies).toHaveLength(2);
      expect(replies.map((r) => r.content)).toContain("First reply");
      expect(replies.map((r) => r.content)).toContain("Second reply");
    });

    test("should handle many-to-many user-category relationships", async () => {
      // Create users
      const user1Data = createTestUser({
        name: "User One",
        email: "user1@example.com",
      });
      const user2Data = createTestUser({
        name: "User Two",
        email: "user2@example.com",
      });

      const user1 = await repositories.userRepository.create(user1Data);
      const user2 = await repositories.userRepository.create(user2Data);

      // Create categories
      const category1Data = createTestCategory({
        name: "Technology",
        description: "Tech-related content",
      });
      const category2Data = createTestCategory({
        name: "Design",
        description: "Design-related content",
      });

      const category1 = await repositories.categoryRepository.create(
        category1Data
      );
      const category2 = await repositories.categoryRepository.create(
        category2Data
      );

      // Create many-to-many relationships via pivot table
      await repositories.userCategoryRepository.create({
        userId: user1.id,
        categoryId: category1.id,
        joinedAt: new Date(),
      });
      await repositories.userCategoryRepository.create({
        userId: user1.id,
        categoryId: category2.id,
        joinedAt: new Date(),
      });
      await repositories.userCategoryRepository.create({
        userId: user2.id,
        categoryId: category1.id,
        joinedAt: new Date(),
      });

      // Test queries through pivot table
      const user1Categories = await repositories.userCategoryRepository.scoped
        .byUserId(user1.id)
        .getMany();

      expect(user1Categories).toHaveLength(2);

      const category1Users = await repositories.userCategoryRepository.scoped
        .byCategoryId(category1.id)
        .getMany();

      expect(category1Users).toHaveLength(2);
    });

    test("should handle post-tag many-to-many relationships", async () => {
      // Create user and post
      const userData = createTestUser({
        name: "Tag User",
        email: "taguser@example.com",
      });
      const user = await repositories.userRepository.create(userData);

      const postData = createTestPost(user.id, {
        title: "Tagged Post",
      });
      const post = await repositories.postRepository.create(postData);

      // Create tags
      const tag1Data = createTestTag({
        name: "javascript",
        color: "#F7DF1E",
      });
      const tag2Data = createTestTag({
        name: "typescript",
        color: "#007ACC",
      });

      const tag1 = await repositories.tagRepository.create(tag1Data);
      const tag2 = await repositories.tagRepository.create(tag2Data);

      // Create post-tag relationships
      await repositories.postTagRepository.create({
        postId: post.id,
        tagId: tag1.id,
        createdAt: new Date(),
      });
      await repositories.postTagRepository.create({
        postId: post.id,
        tagId: tag2.id,
        createdAt: new Date(),
      });

      // Test queries through pivot table
      const postTags = await repositories.postTagRepository.scoped
        .byPostId(post.id)
        .getMany();

      expect(postTags).toHaveLength(2);

      const tagPosts = await repositories.postTagRepository.scoped
        .byTagId(tag1.id)
        .getMany();

      expect(tagPosts).toHaveLength(1);
    });
  });

  describe("Advanced Scoped Queries", () => {
    test("should combine multiple scopes", async () => {
      // Create test data
      const userData = createTestUser({
        name: "Scope User",
        email: "scope@example.com",
        age: 30,
      });
      const user = await repositories.userRepository.create(userData);
      const publishedPostData = createTestPost(user.id, {
        title: "Published Post",
        published: true,
      });
      const draftPostData = createTestPost(user.id, {
        title: "Draft Post",
        published: false,
      });

      await repositories.postRepository.create(publishedPostData);
      await repositories.postRepository.create(draftPostData);

      // Test scoped query - published posts only
      const publishedPosts = await repositories.postRepository.scoped
        .published()
        .byUserId(user.id)
        .getMany();

      expect(publishedPosts).toHaveLength(1);
      expect(publishedPosts[0].title).toBe("Published Post");

      // Test scoped query - draft posts only
      const draftPosts = await repositories.postRepository.scoped
        .draft()
        .byUserId(user.id)
        .getMany();

      expect(draftPosts).toHaveLength(1);
      expect(draftPosts[0].title).toBe("Draft Post");

      // Test user scope with age filter
      const usersOver25 = await repositories.userRepository.scoped
        .byAge(25)
        .getMany();

      expect(usersOver25).toHaveLength(1);
      expect(usersOver25[0].name).toBe("Scope User");
    });

    test("should use recent posts scope", async () => {
      const userData = createTestUser({
        name: "Recent User",
        email: "recent@example.com",
      });
      const user = await repositories.userRepository.create(userData);

      // Create a recent post
      const recentPostData = createTestPost(user.id, {
        title: "Recent Post",
      });
      await repositories.postRepository.create(recentPostData);

      // Test recent posts scope (default 7 days)
      const recentPosts = await repositories.postRepository.scoped
        .recent()
        .getMany();

      expect(recentPosts).toHaveLength(1);
      expect(recentPosts[0].title).toBe("Recent Post");

      // Test recent posts with custom days
      const veryRecentPosts = await repositories.postRepository.scoped
        .recent(1)
        .getMany();

      expect(veryRecentPosts).toHaveLength(1);
    });

    test("should filter comments by content and user", async () => {
      const userData = createTestUser({
        name: "Comment User",
        email: "comment@example.com",
      });
      const user = await repositories.userRepository.create(userData);

      const postData = createTestPost(user.id, {
        title: "Comment Post",
      });
      const post = await repositories.postRepository.create(postData);

      const commentData = createTestComment(post.id, user.id, {
        content: "Great post!",
      });
      await repositories.commentRepository.create(commentData);

      // Test filtering by post and user
      const postComments = await repositories.commentRepository.scoped
        .byPostId(post.id)
        .byUserId(user.id)
        .getMany();

      expect(postComments).toHaveLength(1);
      expect(postComments[0].content).toBe("Great post!");
    });

    test("should use tag and category scopes", async () => {
      // Create category with description
      const categoryData = createTestCategory({
        name: "Web Development",
        description: "All about web development",
      });
      await repositories.categoryRepository.create(categoryData);

      // Test category scope
      const categoriesWithDescription =
        await repositories.categoryRepository.scoped
          .withDescription()
          .getMany();

      expect(categoriesWithDescription).toHaveLength(1);
      expect(categoriesWithDescription[0].name).toBe("Web Development");

      // Test search by name
      const foundCategories = await repositories.categoryRepository.scoped
        .byName("Web")
        .getMany();

      expect(foundCategories).toHaveLength(1);

      // Create tag with color
      const tagData = createTestTag({
        name: "react",
        color: "#61DAFB",
      });
      await repositories.tagRepository.create(tagData);

      // Test tag scopes
      const tagsWithColor = await repositories.tagRepository.scoped
        .withColor()
        .getMany();

      expect(tagsWithColor).toHaveLength(1);
      expect(tagsWithColor[0].name).toBe("react");

      const blueColorTags = await repositories.tagRepository.scoped
        .byColor("#61DAFB")
        .getMany();

      expect(blueColorTags).toHaveLength(1);
    });

    test("should test profile scopes", async () => {
      const userData = createTestUser({
        name: "Profile User",
        email: "profile@example.com",
      });
      const user = await repositories.userRepository.create(userData);

      const profileData = createTestProfile(user.id, {
        bio: "Experienced developer",
        website: "https://profileuser.dev",
      });
      await repositories.profileRepository.create(profileData);

      // Test profile scopes
      const profilesWithBio = await repositories.profileRepository.scoped
        .withBio()
        .getMany();

      expect(profilesWithBio).toHaveLength(1);
      expect(profilesWithBio[0].bio).toBe("Experienced developer");

      const profilesWithWebsite = await repositories.profileRepository.scoped
        .withWebsite()
        .getMany();

      expect(profilesWithWebsite).toHaveLength(1);
      expect(profilesWithWebsite[0].website).toBe("https://profileuser.dev");

      const userProfiles = await repositories.profileRepository.scoped
        .byUserId(user.id)
        .getMany();

      expect(userProfiles).toHaveLength(1);
    });
  });
});

describe("Complex Relations Integration Tests", () => {
  let dbAdapter: PostgreSQLAdapter;
  let repositories: TestRepositories;

  beforeAll(async () => {
    dbAdapter = new PostgreSQLAdapter({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME || "querio_test",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
    });
    repositories = createTestRepositories(dbAdapter);

    // Create test tables
    await createTestTables(dbAdapter);
  });

  afterAll(async () => {
    await cleanupTestTables(dbAdapter);
    await dbAdapter.close();
  });

  beforeEach(async () => {
    // Clean up data before each test
    await cleanupTestData(dbAdapter);
  });

  describe("One-to-One Relations", () => {
    test("should create user with profile and fetch with relation", async () => {
      // Create user
      const userData = createTestUser({
        name: "John Doe",
        email: "john@example.com",
      });
      const user = await repositories.userRepository.create(userData);

      // Create profile for user
      const profileData = createTestProfile(user.id, {
        bio: "Software developer and coffee enthusiast",
        website: "https://johndoe.dev",
      });
      const profile = await repositories.profileRepository.create(profileData);

      // Fetch user with profile relation
      const userWithProfile = (await repositories.userRepository.findOne({
        where: { id: user.id },
        relations: { profile: true },
      })) as UserWithRelations;

      expect(userWithProfile).toBeDefined();
      expect(userWithProfile.profile).toBeDefined();
      expect(userWithProfile.profile?.id).toBe(profile.id);
      expect(userWithProfile.profile?.bio).toBe(
        "Software developer and coffee enthusiast"
      );
    });

    test("should handle user without profile", async () => {
      const userData = createTestUser({
        name: "Jane Doe",
        email: "jane@example.com",
      });
      const user = await repositories.userRepository.create(userData);

      const userWithProfile = (await repositories.userRepository.findOne({
        where: { id: user.id },
        relations: { profile: true },
      })) as UserWithRelations;

      expect(userWithProfile).toBeDefined();
      expect(userWithProfile.profile).toBeNull();
    });
  });

  describe("One-to-Many Relations", () => {
    test("should create user with multiple posts and fetch with relation", async () => {
      // Create user
      const userData = createTestUser({
        name: "Blog Author",
        email: "author@blog.com",
      });
      const user = await repositories.userRepository.create(userData);

      // Create multiple posts
      const post1Data = createTestPost(user.id, {
        title: "First Post",
        content: "Content of first post",
      });
      const post2Data = createTestPost(user.id, {
        title: "Second Post",
        content: "Content of second post",
        published: false,
      });

      await repositories.postRepository.create(post1Data);
      await repositories.postRepository.create(post2Data);

      // Fetch user with posts
      const userWithPosts = (await repositories.userRepository.findOne({
        where: { id: user.id },
        relations: { posts: true },
      })) as UserWithRelations;

      expect(userWithPosts).toBeDefined();
      expect(userWithPosts.posts).toHaveLength(2);
      expect(userWithPosts.posts?.map((p: any) => p.title)).toContain(
        "First Post"
      );
      expect(userWithPosts.posts?.map((p: any) => p.title)).toContain(
        "Second Post"
      );
    });

    test("should fetch posts with their user relation", async () => {
      const userData = createTestUser({
        name: "Post Author",
        email: "postauthor@example.com",
      });
      const user = await repositories.userRepository.create(userData);

      const postData = createTestPost(user.id, {
        title: "Post with Author",
      });
      const post = await repositories.postRepository.create(postData);

      const postWithUser = (await repositories.postRepository.findOne({
        where: { id: post.id },
        relations: { user: true },
      })) as PostWithRelations;

      expect(postWithUser).toBeDefined();
      expect(postWithUser.user).toBeDefined();
      expect(postWithUser.user?.name).toBe("Post Author");
      expect(postWithUser.user?.email).toBe("postauthor@example.com");
    });
  });

  describe("Nested One-to-Many Relations", () => {
    test("should fetch user with posts and their comments", async () => {
      // Create user
      const userData = createTestUser({
        name: "Content Creator",
        email: "creator@example.com",
      });
      const user = await repositories.userRepository.create(userData);

      // Create post
      const postData = createTestPost(user.id, {
        title: "Post with Comments",
      });
      const post = await repositories.postRepository.create(postData);

      // Create comments
      const comment1Data = createTestComment(post.id, user.id, {
        content: "First comment",
      });
      const comment2Data = createTestComment(post.id, user.id, {
        content: "Second comment",
      });

      await repositories.commentRepository.create(comment1Data);
      await repositories.commentRepository.create(comment2Data);

      // Fetch user with nested relations
      const userWithNestedData = (await repositories.userRepository.findOne({
        where: { id: user.id },
        relations: {
          posts: {
            comments: true,
          },
        },
      })) as UserWithRelations;
      expect(userWithNestedData).toBeDefined();
      expect(userWithNestedData.posts).toHaveLength(1);
      expect((userWithNestedData?.posts?.[0] as any).comments).toHaveLength(2);
    });
  });

  describe("Self-Referencing Relations", () => {
    test("should handle nested comment threads", async () => {
      // Create user and post
      const userData = createTestUser({
        name: "Commenter",
        email: "commenter@example.com",
      });
      const user = await repositories.userRepository.create(userData);

      const postData = createTestPost(user.id, {
        title: "Post for Comments",
      });
      const post = await repositories.postRepository.create(postData);

      // Create parent comment
      const parentCommentData = createTestComment(post.id, user.id, {
        content: "Parent comment",
      });
      const parentComment = await repositories.commentRepository.create(
        parentCommentData
      );

      // Create reply comments
      const reply1Data = createTestComment(post.id, user.id, {
        content: "First reply",
        parentCommentId: parentComment.id,
      });
      const reply2Data = createTestComment(post.id, user.id, {
        content: "Second reply",
        parentCommentId: parentComment.id,
      });

      await repositories.commentRepository.create(reply1Data);
      await repositories.commentRepository.create(reply2Data);

      // Fetch parent comment with replies
      const commentWithReplies = (await repositories.commentRepository.findOne({
        where: { id: parentComment.id },
        relations: { replies: true },
      })) as CommentWithRelations;

      expect(commentWithReplies).toBeDefined();
      expect(commentWithReplies.replies).toHaveLength(2);
      expect(commentWithReplies.replies?.map((r: any) => r.content)).toContain(
        "First reply"
      );
      expect(commentWithReplies.replies?.map((r: any) => r.content)).toContain(
        "Second reply"
      );

      // Test top-level comments scope
      const topLevelComments = await repositories.commentRepository.scoped
        .topLevel()
        .byPostId(post.id)
        .getMany();

      expect(topLevelComments).toHaveLength(1);
      expect(topLevelComments[0].content).toBe("Parent comment");
    });
  });

  describe("Many-to-Many Relations", () => {
    test("should handle user-category many-to-many relationships", async () => {
      // Create users
      const user1Data = createTestUser({
        name: "User One",
        email: "user1@example.com",
      });
      const user2Data = createTestUser({
        name: "User Two",
        email: "user2@example.com",
      });

      const user1 = await repositories.userRepository.create(user1Data);
      const user2 = await repositories.userRepository.create(user2Data);

      // Create categories
      const category1Data = createTestCategory({
        name: "Technology",
        description: "Tech-related content",
      });
      const category2Data = createTestCategory({
        name: "Design",
        description: "Design-related content",
      });

      const category1 = await repositories.categoryRepository.create(
        category1Data
      );
      const category2 = await repositories.categoryRepository.create(
        category2Data
      );

      // Create many-to-many relationships
      await repositories.userCategoryRepository.create({
        userId: user1.id,
        categoryId: category1.id,
        joinedAt: new Date(),
      });
      await repositories.userCategoryRepository.create({
        userId: user1.id,
        categoryId: category2.id,
        joinedAt: new Date(),
      });
      await repositories.userCategoryRepository.create({
        userId: user2.id,
        categoryId: category1.id,
        joinedAt: new Date(),
      });

      // Test fetching user with categories
      const user1WithCategories = (await repositories.userRepository.findOne({
        where: { id: user1.id },
        relations: { categories: true },
      })) as UserWithRelations;

      expect(user1WithCategories.categories).toHaveLength(2);
      expect(user1WithCategories.categories?.map((c: any) => c.name)).toContain(
        "Technology"
      );
      expect(user1WithCategories.categories?.map((c: any) => c.name)).toContain(
        "Design"
      );

      // Test fetching category with users
      const category1WithUsers = (await repositories.categoryRepository.findOne(
        {
          where: { id: category1.id },
          relations: { users: true },
        }
      )) as any;

      expect(category1WithUsers!.users).toHaveLength(2);
      expect(category1WithUsers!.users?.map((u: any) => u.name)).toContain(
        "User One"
      );
      expect(category1WithUsers!.users?.map((u: any) => u.name)).toContain(
        "User Two"
      );
    });

    test("should handle post-tag many-to-many relationships", async () => {
      // Create user and post
      const userData = createTestUser({
        name: "Tag User",
        email: "taguser@example.com",
      });
      const user = await repositories.userRepository.create(userData);

      const postData = createTestPost(user.id, {
        title: "Tagged Post",
      });
      const post = await repositories.postRepository.create(postData);

      // Create tags
      const tag1Data = createTestTag({
        name: "javascript",
        color: "#F7DF1E",
      });
      const tag2Data = createTestTag({
        name: "typescript",
        color: "#007ACC",
      });

      const tag1 = await repositories.tagRepository.create(tag1Data);
      const tag2 = await repositories.tagRepository.create(tag2Data);

      // Create post-tag relationships
      await repositories.postTagRepository.create({
        postId: post.id,
        tagId: tag1.id,
        createdAt: new Date(),
      });
      await repositories.postTagRepository.create({
        postId: post.id,
        tagId: tag2.id,
        createdAt: new Date(),
      });

      // Fetch post with tags
      const postWithTags = (await repositories.postRepository.findOne({
        where: { id: post.id },
        relations: { tags: true },
      })) as PostWithRelations;

      expect(postWithTags.tags).toHaveLength(2);
      expect(postWithTags.tags?.map((t: any) => t.name)).toContain(
        "javascript"
      );
      expect(postWithTags.tags?.map((t: any) => t.name)).toContain(
        "typescript"
      );
    });
  });

  describe("Complex Query Scopes with Relations", () => {
    test("should combine scopes with relation loading", async () => {
      // Create test data
      const userData = createTestUser({
        name: "Scope User",
        email: "scope@example.com",
        age: 30,
      });
      const user = await repositories.userRepository.create(userData);

      const publishedPostData = createTestPost(user.id, {
        title: "Published Post",
        published: true,
      });
      const draftPostData = createTestPost(user.id, {
        title: "Draft Post",
        published: false,
      });

      await repositories.postRepository.create(publishedPostData);
      await repositories.postRepository.create(draftPostData);

      // Test scoped query with relations
      const publishedPosts = (await repositories.postRepository.find({
        where: { userId: user.id, published: true },
        relations: { user: true },
      })) as PostWithRelations[];

      expect(publishedPosts).toHaveLength(1);
      expect(publishedPosts[0].title).toBe("Published Post");
      expect(publishedPosts[0].user?.name).toBe("Scope User");

      // Test user scope with age filter and posts relation
      const usersOver25WithPosts = (await repositories.userRepository.find({
        where: { age: { gte: 25 } },
        relations: { posts: true },
      })) as UserWithRelations[];

      expect(usersOver25WithPosts).toHaveLength(1);
      expect(usersOver25WithPosts[0].posts).toHaveLength(2);
    });
  });
});

// Helper functions for test setup and cleanup
async function createTestTables(dbAdapter: PostgreSQLAdapter) {
  const queries = [
    `CREATE TABLE IF NOT EXISTS test_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      age INTEGER,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS test_profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID UNIQUE NOT NULL,
      bio TEXT,
      website VARCHAR(255),
      avatar VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES test_users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS test_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      user_id UUID NOT NULL,
      balance INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES test_users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS test_posts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      user_id UUID NOT NULL,
      published BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES test_users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS test_comments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      content TEXT NOT NULL,
      post_id UUID NOT NULL,
      user_id UUID NOT NULL,
      parent_comment_id UUID,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES test_posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES test_users(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_comment_id) REFERENCES test_comments(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS test_categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) UNIQUE NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS test_user_categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      category_id UUID NOT NULL,
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, category_id),
      FOREIGN KEY (user_id) REFERENCES test_users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES test_categories(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS test_tags (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) UNIQUE NOT NULL,
      color VARCHAR(7),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS test_post_tags (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id UUID NOT NULL,
      tag_id UUID NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(post_id, tag_id),
      FOREIGN KEY (post_id) REFERENCES test_posts(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES test_tags(id) ON DELETE CASCADE
    )`,
  ];

  for (const query of queries) {
    await dbAdapter.execute({ sql: query, params: [] });
  }
}

async function cleanupTestTables(dbAdapter: PostgreSQLAdapter) {
  const tables = [
    "test_post_tags",
    "test_user_categories",
    "test_comments",
    "test_posts",
    "test_accounts",
    "test_profiles",
    "test_tags",
    "test_categories",
    "test_users",
  ];

  for (const table of tables) {
    await dbAdapter.execute({
      sql: `DROP TABLE IF EXISTS ${table} CASCADE`,
      params: [],
    });
  }
}

async function cleanupTestData(dbAdapter: PostgreSQLAdapter) {
  const tables = [
    "test_post_tags",
    "test_user_categories",
    "test_comments",
    "test_posts",
    "test_accounts",
    "test_profiles",
    "test_tags",
    "test_categories",
    "test_users",
  ];

  for (const table of tables) {
    await dbAdapter.execute({ sql: `DELETE FROM ${table}`, params: [] });
  }
}
