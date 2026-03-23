import React, { useEffect, useState } from "react";
import type { Post, User } from "../types";
import MarkdownRenderer from "./MarkdownRenderer";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

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
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center p-6">
        <Card className="px-8 py-6 text-slate-100">
          正在加载帖子详情...
        </Card>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-6xl p-6">
        <Card className="p-6">
          <p className="text-rose-200">{error || "帖子不存在"}</p>
          <Button type="button" onClick={onBack} variant="cyan" className="mt-4">
            返回
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl p-4 sm:p-8">
      <Card className="mb-5">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs tracking-[0.2em] text-cyan-100/85">POST DETAIL</p>
            <CardTitle className="bg-gradient-to-r from-rose-100 via-orange-100 to-cyan-100 bg-clip-text text-2xl text-transparent">
              {resolvePostTitle(post)}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="muted">当前用户: {currentUser.username}</Badge>
            <Button type="button" onClick={onBack} variant="cyan">
              返回主页
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card className="overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
          <CardContent className="p-6 sm:p-8">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-300 to-cyan-200 font-bold text-slate-900">
                {post.author.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-base font-semibold text-slate-100">{post.author}</p>
                <p className="text-xs text-slate-300/70">{formatTime(post.createdAt)}</p>
              </div>
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              {(post.tags ?? []).map((tag) => (
                <Badge key={tag}>#{tag}</Badge>
              ))}
              {(post.tags ?? []).length === 0 && <Badge variant="muted">#未分类</Badge>}
            </div>

            <MarkdownRenderer content={post.content || ""} className="max-w-none text-slate-100" />
          </CardContent>

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
      </Card>
    </div>
  );
}
