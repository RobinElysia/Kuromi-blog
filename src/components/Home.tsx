import React, { useEffect, useMemo, useState } from "react";
import { User, Post } from "../types";
import MarkdownRenderer from "./MarkdownRenderer";

interface HomeProps {
  user: User;
  search: string;
  onLogout: () => void;
  onChangeWallpaper: () => void;
  onOpenPost: (postId: number) => void;
  onOpenEditor: () => void;
}

const SITE_STARTED_AT = new Date("2026-03-08T00:00:00+08:00");
const LEFT_AVATAR = new URL("../public/kuromi/1x1/illust_1.png", import.meta.url).href;
const TIMELINE_BANNER = new URL("../public/kuromi/16x9/PJL_05.png", import.meta.url).href;
const ADMIN_SET = new Set(["RobinElysia", "Meow"]);

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function formatRuntime(now: Date) {
  const diffMs = Math.max(now.getTime() - SITE_STARTED_AT.getTime(), 0);
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${days}天 ${hours}小时 ${minutes}分钟`;
}

function resolvePostTitle(post: Post) {
  const title = post.title?.trim();
  if (title) return title;
  const fallback = post.content?.replace(/\s+/g, " ").trim().slice(0, 24);
  return fallback || "无标题帖子";
}

export default function Home({ user, search, onLogout, onChangeWallpaper, onOpenPost, onOpenEditor }: HomeProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});
  const [submittingCommentId, setSubmittingCommentId] = useState<number | null>(null);
  const [runtimeText, setRuntimeText] = useState(() => formatRuntime(new Date()));

  const fetchPosts = async () => {
    try {
      const res = await fetch("/api/posts?limit=20");
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

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRuntimeText(formatRuntime(new Date()));
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  const handleSubmitComment = async (postId: number) => {
    const commentText = commentInputs[postId]?.trim();
    if (!commentText) return;

    setSubmittingCommentId(postId);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: user.username,
          content: commentText,
        }),
      });

      if (res.ok) {
        setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
        fetchPosts();
      }
    } catch (err) {
      console.error("Failed to create comment:", err);
    } finally {
      setSubmittingCommentId(null);
    }
  };

  const filteredPosts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return posts;

    return posts.filter((post) => {
      const combined = `${resolvePostTitle(post)} ${post.author} ${post.content}`.toLowerCase();
      return combined.includes(keyword);
    });
  }, [posts, search]);

  const timelineItems = useMemo(
    () =>
      filteredPosts.map((post) => ({
        id: post.id,
        title: resolvePostTitle(post),
        createdAt: post.createdAt,
      })),
    [filteredPosts]
  );

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto grid w-full max-w-[1500px] gap-5 lg:grid-cols-[320px_minmax(0,1fr)_320px]">
        <aside className="rounded-3xl border border-slate-100/20 bg-slate-950/70 p-5 shadow-[0_18px_40px_rgba(12,20,36,0.5)] backdrop-blur-md lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)] lg:overflow-auto">
          <div className="mb-5 overflow-hidden rounded-2xl border border-slate-200/20">
            <img src={LEFT_AVATAR} alt="avatar" className="h-48 w-full object-cover" />
          </div>

          <div className="space-y-3 text-sm text-slate-100/90">
            <h1 className="bg-gradient-to-r from-rose-100 via-orange-100 to-cyan-100 bg-clip-text text-2xl font-bold text-transparent">
              Kuromi Secret Base
            </h1>
            <p className="rounded-xl border border-slate-200/15 bg-slate-900/70 p-3">
              当前用户: <span className="font-semibold text-cyan-100">{user.username}</span>
            </p>
            <p className="rounded-xl border border-slate-200/15 bg-slate-900/70 p-3">建站时间: 3.8</p>
            <p className="rounded-xl border border-slate-200/15 bg-slate-900/70 p-3">运行时间: {runtimeText}</p>
            <p className="rounded-xl border border-slate-200/15 bg-slate-900/70 p-3">
              我们没有注册功能，因为只有 RobinElysia 和 Meow 管理本站；访客模式可进入浏览与评论。
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              onClick={onChangeWallpaper}
              className="rounded-xl border border-cyan-200/40 bg-cyan-200/10 px-3 py-2 text-cyan-100 transition hover:bg-cyan-200/25"
              title="切换壁纸"
            >
              切换壁纸
            </button>
            <button
              onClick={onLogout}
              className="rounded-xl border border-rose-200/35 bg-rose-200/10 px-3 py-2 text-rose-100 transition hover:bg-rose-200/25"
              title="退出登录"
            >
              退出登录
            </button>
          </div>

          {ADMIN_SET.has(user.username) && (
            <button
              type="button"
              onClick={onOpenEditor}
              className="mt-3 w-full rounded-xl bg-gradient-to-r from-rose-400 via-orange-300 to-cyan-300 px-4 py-2 text-sm font-semibold text-slate-900"
            >
              进入帖子编辑页
            </button>
          )}
        </aside>

        <main className="space-y-4">
          {filteredPosts.map((post) => (
            <article
              key={post.id}
              className="rounded-3xl border border-slate-100/15 bg-slate-950/68 p-6 shadow-[0_18px_40px_rgba(12,20,36,0.5)] backdrop-blur-md"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-300 to-cyan-200 font-bold text-slate-900">
                    {post.author.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-50">{resolvePostTitle(post)}</h3>
                    <p className="text-xs text-slate-300/70">
                      {post.author} · {formatDateTime(post.createdAt)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenPost(post.id)}
                  className="rounded-xl border border-cyan-200/40 bg-cyan-200/10 px-3 py-2 text-xs text-cyan-100 transition hover:bg-cyan-200/25"
                >
                  查看详情
                </button>
              </div>

              <MarkdownRenderer
                content={post.content}
                className="prose prose-invert max-w-none text-slate-100 prose-headings:text-rose-100 prose-strong:text-orange-100 prose-p:text-slate-100/90"
              />

              <div className="mt-5 border-t border-slate-200/15 pt-4">
                <p className="mb-3 text-sm text-slate-200">评论（{post.comments?.length ?? 0}）</p>

                <div className="space-y-3">
                  {(post.comments ?? []).map((comment) => (
                    <div key={comment.id} className="rounded-xl border border-slate-200/15 bg-slate-800/40 px-3 py-2">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-cyan-100">{comment.author}</p>
                        <p className="text-[11px] text-slate-300/70">{formatDateTime(comment.createdAt)}</p>
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-slate-100/90">{comment.content}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex gap-2">
                    <input
                      value={commentInputs[post.id] ?? ""}
                    onChange={(e) =>
                      setCommentInputs((prev) => ({
                        ...prev,
                        [post.id]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSubmitComment(post.id);
                      }
                    }}
                      placeholder="写下你的评论…"
                      aria-label={`帖子 ${post.id} 评论输入框`}
                      className="flex-1 rounded-xl border border-slate-200/25 bg-slate-900/65 px-3 py-2 text-base text-slate-100 placeholder:text-slate-300/55 outline-none transition focus:border-orange-200/50 focus:ring-1 focus:ring-orange-200/50 sm:text-sm"
                    />
                  <button
                    type="button"
                    onClick={() => handleSubmitComment(post.id)}
                    disabled={submittingCommentId === post.id || !commentInputs[post.id]?.trim()}
                    className="rounded-xl bg-gradient-to-r from-orange-300 to-rose-300 px-4 py-2 text-sm font-semibold text-slate-900 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    发送
                  </button>
                </div>
              </div>
            </article>
          ))}

          {filteredPosts.length === 0 && (
            <div className="rounded-3xl border border-slate-100/20 bg-slate-950/55 py-14 text-center text-slate-200/75 backdrop-blur-md">
              <p>没有匹配的帖子。</p>
            </div>
          )}
        </main>

        <aside className="rounded-3xl border border-slate-100/20 bg-slate-950/70 p-5 shadow-[0_18px_40px_rgba(12,20,36,0.5)] backdrop-blur-md lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)] lg:overflow-auto">
          <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200/20">
            <img src={TIMELINE_BANNER} alt="timeline" className="h-32 w-full object-cover" />
          </div>
          <h2 className="mb-3 text-lg font-semibold text-slate-100">时间轴</h2>
          <div className="relative space-y-4 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-px before:bg-gradient-to-b before:from-cyan-200/70 before:via-rose-200/45 before:to-transparent">
            {timelineItems.slice(0, 12).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpenPost(item.id)}
                className="relative block w-full rounded-xl border border-slate-200/15 bg-slate-900/65 p-3 pl-8 text-left transition hover:border-cyan-200/40 hover:bg-slate-800/65"
              >
                <span className="absolute left-[7px] top-4 h-2.5 w-2.5 rounded-full bg-gradient-to-r from-rose-300 to-cyan-200" />
                <p className="text-xs text-slate-300/75">{formatDateTime(item.createdAt)}</p>
                <p className="mt-1 truncate text-sm text-slate-100">
                  #{item.id} {item.title}
                </p>
              </button>
            ))}

            {timelineItems.length === 0 && <p className="text-sm text-slate-300/75">暂无时间轴事件。</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
