import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from "redis";
import path from "path";

const app = express();
const PORT = 3000;
const ADMIN_USERS = new Set(["RobinElysia", "Meow"]);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const redisClient = createClient({
  url: "redis://localhost:6379",
});

redisClient.on("error", (err) => console.error("Redis Client Error", err));

function normalizePostTitle(rawTitle: unknown, rawContent: unknown): string {
  const title = String(rawTitle ?? "").trim();
  if (title) return title.slice(0, 120);

  const fallbackFromContent = String(rawContent ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  return fallbackFromContent || "未命名帖子";
}

function normalizePostContent(rawContent: unknown): string {
  return String(rawContent ?? "").replace(/\r\n/g, "\n").trim();
}

function sanitizeAuthor(rawAuthor: unknown): string {
  return String(rawAuthor ?? "").trim();
}

function normalizePostTags(rawTags: unknown): string[] {
  if (!Array.isArray(rawTags)) return [];

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const item of rawTags) {
    const tag = String(item ?? "").trim().replace(/\s+/g, " ").slice(0, 24);
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(tag);
    if (normalized.length >= 12) break;
  }

  return normalized;
}

async function fetchAllPostsRaw() {
  return redisClient.lRange("kuromi:posts", 0, -1);
}

app.post("/api/login", (req, res) => {
  const username = String(req.body?.username ?? "").trim();
  const password = String(req.body?.password ?? "");

  if (!username || !password) {
    return res.status(400).json({ success: false, message: "请输入账号和密码" });
  }

  if (username === "RobinElysia" && password === "000745012010psQ") {
    res.json({ success: true, user: "RobinElysia", role: "admin" });
  } else if (username === "Meow" && password === "030101wbb") {
    res.json({ success: true, user: "Meow", role: "admin" });
  } else {
    res.status(401).json({ success: false, message: "账号或密码错误" });
  }
});

app.get("/api/posts", async (req, res) => {
  try {
    const requestedLimit = Number(req.query.limit ?? 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(Math.floor(requestedLimit), 1), 30)
      : 10;

    const postsData = await redisClient.lRange("kuromi:posts", 0, limit - 1);
    const posts = await Promise.all(
      postsData.map(async (item) => {
        const post = JSON.parse(item.toString());
        const commentsData = await redisClient.lRange(
          `kuromi:posts:${post.id}:comments`,
          0,
          -1
        );

        const comments = commentsData
          .map((commentItem) => JSON.parse(commentItem.toString()))
          .sort((a, b) => a.id - b.id);

        return {
          id: post.id,
          author: post.author,
          title: post.title,
          tags: normalizePostTags(post.tags),
          content: post.content,
          createdAt: post.createdAt,
          comments,
          hasImage: Boolean(post.imageUrl),
          imageWidth: post.imageWidth,
          imageHeight: post.imageHeight,
        };
      })
    );

    res.json(posts);
  } catch (err) {
    console.error("Failed to fetch posts from Redis:", err);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

app.get("/api/posts/:id", async (req, res) => {
  const postId = Number(req.params.id);
  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json({ error: "Invalid post id" });
  }

  try {
    const postsData = await fetchAllPostsRaw();
    const targetPost = postsData
      .map((item) => JSON.parse(item.toString()))
      .find((post) => post.id === postId);

    if (!targetPost) {
      return res.status(404).json({ error: "Post not found" });
    }

    const commentsData = await redisClient.lRange(`kuromi:posts:${postId}:comments`, 0, -1);
    const comments = commentsData
      .map((commentItem) => JSON.parse(commentItem.toString()))
      .sort((a, b) => a.id - b.id);

    return res.json({
      id: targetPost.id,
      author: targetPost.author,
      title: targetPost.title,
      tags: normalizePostTags(targetPost.tags),
      content: targetPost.content,
      createdAt: targetPost.createdAt,
      comments,
      hasImage: Boolean(targetPost.imageUrl),
      imageWidth: targetPost.imageWidth,
      imageHeight: targetPost.imageHeight,
    });
  } catch (err) {
    console.error("Failed to fetch post detail from Redis:", err);
    return res.status(500).json({ error: "Failed to fetch post detail" });
  }
});

app.post("/api/posts", async (req, res) => {
  const author = sanitizeAuthor(req.body?.author);
  const content = normalizePostContent(req.body?.content);
  const title = normalizePostTitle(req.body?.title, content);
  const tags = normalizePostTags(req.body?.tags);
  const imageUrl = String(req.body?.imageUrl ?? "");
  const imageWidth = Number(req.body?.imageWidth);
  const imageHeight = Number(req.body?.imageHeight);

  if (!author) {
    return res.status(400).json({ error: "Author is required" });
  }

  if (!ADMIN_USERS.has(author)) {
    return res.status(403).json({ error: "Only admin can publish posts" });
  }

  if (!content && !imageUrl) {
    return res.status(400).json({ error: "Post content is required" });
  }

  if (content.length > 200_000) {
    return res.status(400).json({ error: "Content is too long" });
  }

  try {
    const id = await redisClient.incr("kuromi:posts:id");
    const post = {
      id,
      author,
      title,
      tags,
      content: content || "",
      imageUrl: imageUrl || "",
      imageWidth: Number.isFinite(imageWidth) ? imageWidth : undefined,
      imageHeight: Number.isFinite(imageHeight) ? imageHeight : undefined,
      createdAt: new Date().toISOString(),
      comments: [],
    };

    await redisClient.lPush("kuromi:posts", JSON.stringify(post));

    return res.json({ id, success: true });
  } catch (err) {
    console.error("Failed to save post to Redis:", err);
    return res.status(500).json({ error: "Failed to create post" });
  }
});

app.put("/api/posts/:id", async (req, res) => {
  const postId = Number(req.params.id);
  const author = sanitizeAuthor(req.body?.author);
  const content = normalizePostContent(req.body?.content);
  const title = normalizePostTitle(req.body?.title, content);
  const tags = normalizePostTags(req.body?.tags);

  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json({ error: "Invalid post id" });
  }

  if (!ADMIN_USERS.has(author)) {
    return res.status(403).json({ error: "Only admin can edit posts" });
  }

  if (!content) {
    return res.status(400).json({ error: "Post content is required" });
  }

  if (content.length > 200_000) {
    return res.status(400).json({ error: "Content is too long" });
  }

  try {
    const postsData = await fetchAllPostsRaw();
    const posts = postsData.map((item) => JSON.parse(item.toString()));
    const targetIndex = posts.findIndex((post) => post.id === postId);
    if (targetIndex === -1) {
      return res.status(404).json({ error: "Post not found" });
    }

    const target = posts[targetIndex];
    if (!ADMIN_USERS.has(String(target.author ?? ""))) {
      return res.status(403).json({ error: "Target post is not editable" });
    }

    posts[targetIndex] = {
      ...target,
      title,
      tags,
      content,
      updatedAt: new Date().toISOString(),
    };

    await redisClient.del("kuromi:posts");
    if (posts.length > 0) {
      await redisClient.rPush(
        "kuromi:posts",
        posts.map((post) => JSON.stringify(post))
      );
    }

    return res.json({ success: true, id: postId });
  } catch (err) {
    console.error("Failed to update post:", err);
    return res.status(500).json({ error: "Failed to update post" });
  }
});

app.delete("/api/posts/:id", async (req, res) => {
  const postId = Number(req.params.id);
  const author = sanitizeAuthor(req.body?.author);

  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json({ error: "Invalid post id" });
  }

  if (!ADMIN_USERS.has(author)) {
    return res.status(403).json({ error: "Only admin can delete posts" });
  }

  try {
    const postsData = await fetchAllPostsRaw();
    const posts = postsData.map((item) => JSON.parse(item.toString()));
    const targetIndex = posts.findIndex((post) => post.id === postId);
    if (targetIndex === -1) {
      return res.status(404).json({ error: "Post not found" });
    }

    posts.splice(targetIndex, 1);

    await redisClient.del("kuromi:posts");
    if (posts.length > 0) {
      await redisClient.rPush(
        "kuromi:posts",
        posts.map((post) => JSON.stringify(post))
      );
    }

    await redisClient.del(`kuromi:posts:${postId}:comments`);
    await redisClient.del(`kuromi:posts:${postId}:comments:id`);

    return res.json({ success: true, id: postId });
  } catch (err) {
    console.error("Failed to delete post:", err);
    return res.status(500).json({ error: "Failed to delete post" });
  }
});

app.get("/api/posts/:id/image", async (req, res) => {
  const postId = Number(req.params.id);
  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json({ error: "Invalid post id" });
  }

  try {
    const postsData = await redisClient.lRange("kuromi:posts", 0, -1);
    const target = postsData
      .map((item) => JSON.parse(item.toString()))
      .find((post) => post.id === postId);

    if (!target?.imageUrl) {
      return res.status(404).json({ error: "Image not found" });
    }

    const imageUrl = String(target.imageUrl);
    res.setHeader("Cache-Control", "public, max-age=600");

    // Stored images are data URLs in Redis.
    if (imageUrl.startsWith("data:")) {
      const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        return res.status(400).json({ error: "Invalid image data" });
      }

      const [, mimeType, base64] = match;
      const buffer = Buffer.from(base64, "base64");
      res.setHeader("Content-Type", mimeType || "image/jpeg");
      return res.send(buffer);
    }

    return res.redirect(imageUrl);
  } catch (err) {
    console.error("Failed to load image:", err);
    return res.status(500).json({ error: "Failed to load image" });
  }
});

app.post("/api/posts/:id/comments", async (req, res) => {
  const postId = Number(req.params.id);
  const { author, content } = req.body;

  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json({ error: "Invalid post id" });
  }

  if (!author || !content?.trim()) {
    return res.status(400).json({ error: "Author and content are required" });
  }

  try {
    const postsData = await redisClient.lRange("kuromi:posts", 0, -1);
    const postExists = postsData.some((item) => {
      const post = JSON.parse(item.toString());
      return post.id === postId;
    });

    if (!postExists) {
      return res.status(404).json({ error: "Post not found" });
    }

    const commentId = await redisClient.incr(`kuromi:posts:${postId}:comments:id`);
    const comment = {
      id: commentId,
      postId,
      author,
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    await redisClient.rPush(`kuromi:posts:${postId}:comments`, JSON.stringify(comment));

    return res.json({ success: true, comment });
  } catch (err) {
    console.error("Failed to save comment to Redis:", err);
    return res.status(500).json({ error: "Failed to create comment" });
  }
});

async function startServer() {
  try {
    await redisClient.connect();
    console.log("Connected to Redis at redis://localhost:6379");
  } catch (err) {
    console.error("Could not connect to Redis:", err);
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
