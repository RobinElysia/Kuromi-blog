import React, { useEffect, useMemo, useRef, useState } from "react";
import { User, Post } from "../types";

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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function toExcerpt(content: string, maxLength = 180) {
  const plain = content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[[^\]]+\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[>*_~|-]/g, " ")
    .replace(/\$\$?[\s\S]*?\$\$?/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!plain) return "（暂无正文预览）";
  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength)}…`;
}

export default function Home({ user, search, onLogout, onChangeWallpaper, onOpenPost, onOpenEditor }: HomeProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [runtimeText, setRuntimeText] = useState(() => formatRuntime(new Date()));
  const [scrollRatio, setScrollRatio] = useState(0);
  const [isDraggingDot, setIsDraggingDot] = useState(false);
  const arcRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const updateScrollRatio = () => {
      const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
      if (maxScroll === 0) {
        setScrollRatio(0);
        return;
      }
      setScrollRatio(window.scrollY / maxScroll);
    };

    updateScrollRatio();
    window.addEventListener("scroll", updateScrollRatio, { passive: true });
    window.addEventListener("resize", updateScrollRatio, { passive: true });
    return () => {
      window.removeEventListener("scroll", updateScrollRatio);
      window.removeEventListener("resize", updateScrollRatio);
    };
  }, []);

  const scrollToRatio = (ratio: number) => {
    const nextRatio = clamp(ratio, 0, 1);
    const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
    window.scrollTo({ top: maxScroll * nextRatio, behavior: "auto" });
  };

  const updateByClientY = (clientY: number) => {
    const arc = arcRef.current;
    if (!arc) return;
    const rect = arc.getBoundingClientRect();
    const ratio = (clientY - rect.top) / rect.height;
    scrollToRatio(ratio);
  };

  const handleArcPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    updateByClientY(event.clientY);
  };

  const handleDotPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDraggingDot(true);
    event.currentTarget.setPointerCapture(event.pointerId);

    const onPointerMove = (moveEvent: PointerEvent) => {
      updateByClientY(moveEvent.clientY);
    };

    const onPointerUp = () => {
      setIsDraggingDot(false);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const filteredPosts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return posts;

    return posts.filter((post) => {
      const combined = `${resolvePostTitle(post)} ${post.author} ${post.content} ${(post.tags ?? []).join(" ")}`.toLowerCase();
      return combined.includes(keyword);
    });
  }, [posts, search]);

  const dotY = 20 + 272 * scrollRatio;
  const arcBend = 64;
  const dotX = 72 - arcBend * 4 * scrollRatio * (1 - scrollRatio);

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto grid w-full max-w-[1500px] gap-5 lg:grid-cols-[320px_minmax(0,1fr)_220px]">
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
            <p className="rounded-xl border border-slate-200/15 bg-slate-900/70 p-3">建站时间: 2026-03-08</p>
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

              <div className="mb-3 flex flex-wrap gap-2">
                {(post.tags ?? []).map((tag) => (
                  <span key={`${post.id}-${tag}`} className="rounded-full border border-cyan-200/35 bg-cyan-200/10 px-2.5 py-1 text-xs text-cyan-100">
                    #{tag}
                  </span>
                ))}
                {(post.tags ?? []).length === 0 && <span className="text-xs text-slate-400/80">#未分类</span>}
              </div>

              <p
                className="overflow-hidden text-sm leading-7 text-slate-200/90"
                style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}
              >
                {toExcerpt(post.content)}
              </p>
            </article>
          ))}

          {filteredPosts.length === 0 && (
            <div className="rounded-3xl border border-slate-100/20 bg-slate-950/55 py-14 text-center text-slate-200/75 backdrop-blur-md">
              <p>没有匹配的帖子。</p>
            </div>
          )}
        </main>

        <aside className="p-2 lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)]">
          <h2 className="text-center text-xs tracking-[0.24em] text-slate-100/90">ARC SCROLL</h2>
          <p className="mt-2 text-center text-xs text-slate-200/85">拖拽亚克力光点快速上下移动页面</p>

          <div className="mt-5 flex justify-center">
            <div
              ref={arcRef}
              onPointerDown={handleArcPointerDown}
              className="relative h-[312px] w-[132px]"
              role="presentation"
            >
              <svg width="132" height="312" viewBox="0 0 132 312" fill="none" className="absolute inset-0">
                <path
                  d="M72 20 Q8 156 72 292"
                  stroke="url(#arc-glow-base)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="opacity-85"
                />
                <path
                  d="M72 20 Q8 156 72 292"
                  stroke="url(#arc-glow-animated)"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeDasharray="28 16"
                  className="arc-flow"
                />
                <defs>
                  <linearGradient id="arc-glow-base" x1="72" y1="20" x2="72" y2="292" gradientUnits="userSpaceOnUse">
                    <stop stopColor="rgba(251,113,133,0.62)" />
                    <stop offset="0.5" stopColor="rgba(192,132,252,0.42)" />
                    <stop offset="1" stopColor="rgba(34,211,238,0.68)" />
                  </linearGradient>
                  <linearGradient id="arc-glow-animated" x1="72" y1="20" x2="72" y2="292" gradientUnits="userSpaceOnUse">
                    <stop stopColor="rgba(255,207,240,0.94)" />
                    <stop offset="0.5" stopColor="rgba(227,166,255,0.9)" />
                    <stop offset="1" stopColor="rgba(148,240,255,0.9)" />
                  </linearGradient>
                </defs>
              </svg>

              <button
                type="button"
                onPointerDown={handleDotPointerDown}
                onKeyDown={(event) => {
                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    scrollToRatio(scrollRatio - 0.05);
                  }
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    scrollToRatio(scrollRatio + 0.05);
                  }
                }}
                aria-label="页面滚动控制点"
                className={`absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/70 bg-white/35 shadow-[0_0_30px_rgba(255,255,255,0.46)] backdrop-blur-xl outline-none transition ${
                  isDraggingDot ? "scale-110" : "acrylic-dot"
                }`}
                style={{ left: `${dotX}px`, top: `${dotY}px` }}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
