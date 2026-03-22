import React, { useEffect, useState } from "react";
import type { Post, User } from "../types";
import MarkdownRenderer from "./MarkdownRenderer";

const ILLUSTRATION = new URL("../public/kuromi/16x9/kv_krm.png", import.meta.url).href;

interface PostDetailProps {
  postId: number;
  currentUser: User;
  onBack: () => void;
}

function formatTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    hour12: false,
  });
}

function resolvePostTitle(post: Post) {
  const title = post.title?.trim();
  if (title) return title;
  const fallback = post.content?.replace(/\s+/g, " ").trim().slice(0, 30);
  return fallback || "无标题帖子";
}

export default function PostDetail({ postId, currentUser, onBack }: PostDetailProps) {
  const [post, setPost] = useState<Post | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let aborted = false;

    async function loadPost() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`/api/posts/${postId}`);
        if (!res.ok) {
          setError("帖子不存在或已被删除");
          setPost(null);
          return;
        }

        const data = (await res.json()) as Post;
        if (!aborted) setPost(data);
      } catch (err) {
        console.error("Failed to fetch post:", err);
        if (!aborted) setError("加载失败，请稍后重试");
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    loadPost();
    return () => {
      aborted = true;
    };
  }, [postId]);

  if (loading) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center p-6">
        <div className="rounded-3xl border border-slate-100/20 bg-slate-950/66 px-8 py-6 text-slate-100 backdrop-blur-md">
          正在加载帖子详情…
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-5xl p-6">
        <div className="rounded-3xl border border-slate-100/20 bg-slate-950/66 p-6 backdrop-blur-md">
          <p className="text-rose-200">{error || "帖子不存在"}</p>
          <button
            type="button"
            onClick={onBack}
            className="mt-4 rounded-xl border border-cyan-200/40 bg-cyan-200/10 px-4 py-2 text-cyan-100 transition hover:bg-cyan-200/25"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl p-4 sm:p-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-rose-300/35 bg-slate-950/70 p-4 shadow-[0_16px_45px_rgba(19,28,43,0.42)] backdrop-blur-md">
        <div>
          <p className="text-xs tracking-[0.2em] text-cyan-100/85">POST DETAIL</p>
          <h1 className="bg-gradient-to-r from-rose-100 via-orange-100 to-cyan-100 bg-clip-text text-xl font-bold text-transparent">
            {resolvePostTitle(post)}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-slate-200/30 bg-slate-900/70 px-3 py-1 text-xs text-slate-100">
            当前用户: {currentUser.username}
          </span>
          <button
            type="button"
            onClick={onBack}
            className="rounded-xl border border-cyan-200/40 bg-cyan-200/10 px-4 py-2 text-cyan-100 transition hover:bg-cyan-200/25"
          >
            返回主页
          </button>
        </div>
      </header>

      <article className="overflow-hidden rounded-3xl border border-slate-100/20 bg-slate-950/70 backdrop-blur-md">
        <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="p-6 sm:p-8">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-300 to-cyan-200 font-bold text-slate-900">
                {post.author.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-base font-semibold text-slate-100">{post.author}</p>
                <p className="text-xs text-slate-300/70">{formatTime(post.createdAt)}</p>
              </div>
            </div>

            <MarkdownRenderer
              content={post.content || ""}
              className="prose prose-invert max-w-none text-slate-100 prose-headings:text-rose-100 prose-strong:text-orange-100 prose-p:text-slate-100/90"
            />
          </div>

          <aside className="border-t border-slate-100/15 bg-slate-900/55 p-6 lg:border-l lg:border-t-0">
            <div className="mb-5 overflow-hidden rounded-2xl border border-slate-200/20">
              <img src={ILLUSTRATION} alt="Kuromi illustration" className="h-36 w-full object-cover" />
            </div>
            <h2 className="mb-3 text-sm font-medium text-cyan-100">评论区（{post.comments?.length ?? 0}）</h2>
            <div className="space-y-3">
              {(post.comments ?? []).map((comment) => (
                <div key={comment.id} className="rounded-xl border border-slate-200/15 bg-slate-950/55 px-3 py-2">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-orange-100">{comment.author}</span>
                    <span className="text-[11px] text-slate-300/70">{formatTime(comment.createdAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-slate-100/90">{comment.content}</p>
                </div>
              ))}
              {(post.comments?.length ?? 0) === 0 && <p className="text-sm text-slate-300/75">暂无评论。</p>}
            </div>
          </aside>
        </div>
      </article>
    </div>
  );
}
