import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Post, User } from "../types";
import MarkdownRenderer from "./MarkdownRenderer";

interface PostEditorPageProps {
  currentUser: User;
  search: string;
  onOpenPost: (id: number) => void;
}

const ADMIN_SET = new Set(["RobinElysia", "Meow"]);

function extractPostTitle(post: Post) {
  const title = post.title?.trim();
  if (title) return title;
  const fallback = (post.content ?? "").replace(/\s+/g, " ").trim().slice(0, 30);
  return fallback || "未命名帖子";
}

export default function PostEditorPage({ currentUser, search, onOpenPost }: PostEditorPageProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const isAdmin = ADMIN_SET.has(currentUser.username);

  const fetchPosts = async () => {
    try {
      const res = await fetch("/api/posts?limit=30");
      if (!res.ok) return;
      const data = (await res.json()) as Post[];
      setPosts(data);
    } catch (err) {
      console.error("Failed to fetch posts:", err);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const filteredPosts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return posts;
    return posts.filter((post) => {
      const summary = `${extractPostTitle(post)} ${post.author} ${post.content}`.toLowerCase();
      return summary.includes(keyword);
    });
  }, [posts, search]);

  const handleSelectPost = (post: Post) => {
    setSelectedId(post.id);
    setTitle(extractPostTitle(post));
    setContent(post.content ?? "");
    setMessage("");
  };

  const handleCreateNew = () => {
    setSelectedId(null);
    setTitle("");
    setContent("");
    setMessage("已切换到新文档");
  };

  const handleImportMarkdown = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setContent(text.replace(/\r\n/g, "\n"));
      if (!title.trim()) {
        const firstLine = text
          .split(/\r?\n/)
          .map((line) => line.replace(/^#+\s*/, "").trim())
          .find(Boolean);
        if (firstLine) setTitle(firstLine.slice(0, 120));
      }
      setMessage(`已导入 ${file.name}`);
    } catch (err) {
      console.error("Failed to import markdown:", err);
      setMessage("导入失败，请重试");
    } finally {
      event.target.value = "";
    }
  };

  const handleInsertImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const markdownImage = `\n![${file.name}](${dataUrl})\n`;
      const target = textAreaRef.current;
      if (!target) {
        setContent((prev) => `${prev}${markdownImage}`);
        return;
      }

      const start = target.selectionStart ?? content.length;
      const end = target.selectionEnd ?? content.length;
      const next = content.slice(0, start) + markdownImage + content.slice(end);
      setContent(next);

      window.requestAnimationFrame(() => {
        const cursor = start + markdownImage.length;
        target.focus();
        target.setSelectionRange(cursor, cursor);
      });
      setMessage("图片已插入文档");
    } catch (err) {
      console.error("Failed to insert image:", err);
      setMessage("图片插入失败");
    } finally {
      event.target.value = "";
    }
  };

  const handlePublish = async () => {
    if (!isAdmin) {
      setMessage("访客模式无发布权限");
      return;
    }

    const trimmedContent = content.trim();
    const trimmedTitle = title.trim();
    if (!trimmedContent) {
      setMessage("正文不能为空");
      return;
    }

    setLoading(true);
    try {
      const endpoint = selectedId ? `/api/posts/${selectedId}` : "/api/posts";
      const method = selectedId ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: currentUser.username,
          title: trimmedTitle,
          content: trimmedContent,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage(data.error || "发布失败");
        return;
      }

      const data = (await res.json()) as { id?: number };
      const postId = selectedId ?? data.id ?? null;
      if (postId) setSelectedId(postId);
      await fetchPosts();
      setMessage(selectedId ? "更新成功" : "发布成功");
    } catch (err) {
      console.error("Failed to publish post:", err);
      setMessage("发布失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!isAdmin) {
      setMessage("访客模式无删除权限");
      return;
    }
    if (!selectedId) {
      setMessage("请先选择要删除的帖子");
      return;
    }
    if (!window.confirm("确认删除当前帖子？删除后不可恢复。")) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${selectedId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: currentUser.username }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage(data.error || "删除失败");
        return;
      }

      await fetchPosts();
      handleCreateNew();
      setMessage("已删除帖子");
    } catch (err) {
      console.error("Failed to delete post:", err);
      setMessage("删除失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const previewSource = content.trim()
    ? content
    : "## Preview\n\n在左侧编写 Markdown，支持：\n\n- **Markdown**\n- `$LaTeX$` 与 `$$LaTeX$$`\n- `mermaid` 代码块\n\n```mermaid\ngraph TD;\n  Kuromi --> SecretBase;\n```\n";

  return (
    <div className="mx-auto grid w-full max-w-[1600px] gap-5 p-4 sm:p-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="rounded-3xl border border-slate-100/20 bg-slate-950/72 p-4 backdrop-blur-md">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-100">帖子文档</h2>
          <button
            type="button"
            onClick={handleCreateNew}
            className="rounded-lg border border-cyan-200/35 bg-cyan-200/10 px-2 py-1 text-xs text-cyan-100"
          >
            新建
          </button>
        </div>

        <div className="space-y-2">
          {filteredPosts.map((post) => (
            <button
              key={post.id}
              type="button"
              onClick={() => handleSelectPost(post)}
              className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                selectedId === post.id
                  ? "border-cyan-200/45 bg-cyan-200/12 text-slate-50"
                  : "border-slate-200/15 bg-slate-900/60 text-slate-200/80 hover:border-slate-200/30"
              }`}
            >
              <p className="truncate font-medium">{extractPostTitle(post)}</p>
              <p className="mt-1 text-[11px] text-slate-300/70">{post.author}</p>
            </button>
          ))}
          {filteredPosts.length === 0 && <p className="text-xs text-slate-300/70">暂无匹配文档</p>}
        </div>
      </aside>

      <section className="space-y-5">
        <div className="rounded-3xl border border-slate-100/20 bg-slate-950/70 p-5 backdrop-blur-md">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入帖子标题"
              aria-label="帖子标题"
              className="h-10 flex-1 rounded-xl border border-slate-200/20 bg-slate-900/70 px-3 text-base text-slate-100 outline-none ring-cyan-200/50 transition focus:ring-1 sm:text-sm"
            />
            <label className="cursor-pointer rounded-xl border border-slate-200/25 bg-slate-900/60 px-3 py-2 text-xs text-slate-100">
              导入 .md
              <input type="file" accept=".md,text/markdown" className="hidden" onChange={handleImportMarkdown} />
            </label>
            <label className="cursor-pointer rounded-xl border border-slate-200/25 bg-slate-900/60 px-3 py-2 text-xs text-slate-100">
              插入图片
              <input type="file" accept="image/*" className="hidden" onChange={handleInsertImage} />
            </label>
            <button
              type="button"
              onClick={handlePublish}
              disabled={loading}
              className="rounded-xl bg-gradient-to-r from-rose-400 via-orange-300 to-cyan-300 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-60"
            >
              {selectedId ? "更新发布" : "发布帖子"}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading || !selectedId}
              className="rounded-xl border border-rose-200/35 bg-rose-200/10 px-4 py-2 text-sm text-rose-100 disabled:opacity-60"
            >
              删除
            </button>
            <button
              type="button"
              onClick={() => selectedId && onOpenPost(selectedId)}
              disabled={!selectedId}
              className="rounded-xl border border-cyan-200/35 bg-cyan-200/10 px-4 py-2 text-sm text-cyan-100 disabled:opacity-60"
            >
              查看详情
            </button>
          </div>

          <textarea
            ref={textAreaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="在这里写 Markdown 内容…"
            aria-label="Markdown 编辑器"
            className="min-h-[320px] w-full resize-y rounded-2xl border border-slate-200/15 bg-slate-900/75 p-4 font-mono text-base text-slate-100 outline-none ring-cyan-200/45 transition focus:ring-1 sm:text-sm"
          />
          <p className="mt-2 text-xs text-slate-300/75">
            注：本项目无注册，仅 RobinElysia 与 Meow 有发布管理权限；访客模式可浏览与评论。
          </p>
          {message && <p className="mt-2 text-xs text-orange-100">{message}</p>}
        </div>

        <div className="rounded-3xl border border-slate-100/20 bg-slate-950/70 p-5 backdrop-blur-md">
          <h3 className="mb-3 text-sm font-semibold tracking-wide text-cyan-100/90">实时渲染预览</h3>
          <MarkdownRenderer content={previewSource} className="prose prose-invert max-w-none text-slate-100 prose-headings:text-rose-100 prose-strong:text-orange-100 prose-p:text-slate-100/90" />
        </div>
      </section>
    </div>
  );
}
