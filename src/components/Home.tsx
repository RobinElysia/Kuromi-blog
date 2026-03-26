import React, { useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, Clock3, Crown, FileText, Sparkles } from "lucide-react";
import { User, Post } from "../types";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";

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

function toExcerpt(content: string, maxLength = 200) {
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
  return `${plain.slice(0, maxLength)}...`;
}

export default function Home({ user, search, onLogout, onChangeWallpaper, onOpenPost, onOpenEditor }: HomeProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [runtimeText, setRuntimeText] = useState(() => formatRuntime(new Date()));
  const [scrollRatio, setScrollRatio] = useState(0);
  const [isDraggingDot, setIsDraggingDot] = useState(false);
  const [railHeight, setRailHeight] = useState(() => clamp(window.innerHeight * 0.62, 420, 760));
  const barRef = useRef<HTMLDivElement>(null);

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
    const updateRailHeight = () => {
      setRailHeight(clamp(window.innerHeight * 0.62, 420, 760));
    };
    updateRailHeight();
    window.addEventListener("resize", updateRailHeight, { passive: true });
    return () => window.removeEventListener("resize", updateRailHeight);
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
    const bar = barRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const ratio = (clientY - rect.top) / rect.height;
    scrollToRatio(ratio);
  };

  const handleBarPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
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

  const topPadding = 16;
  const bottomPadding = 16;
  const dotY = topPadding + (railHeight - topPadding - bottomPadding) * scrollRatio;
  const isAdmin = ADMIN_SET.has(user.username);

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto grid w-full max-w-[1550px] gap-5 lg:grid-cols-[320px_minmax(0,1fr)_188px]">
        <Card className="relative overflow-hidden p-5 lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)] lg:overflow-auto lg:px-6 lg:py-7">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,114,182,0.18),transparent_52%),radial-gradient(circle_at_15%_85%,rgba(34,211,238,0.14),transparent_50%)]" />
          <div className="relative space-y-4 pt-2 sm:space-y-5 sm:pt-3 lg:space-y-6 lg:pt-5">
            <div className="overflow-hidden rounded-2xl border border-slate-200/20">
              <img src={LEFT_AVATAR} alt="avatar" className="h-48 w-full object-cover" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl text-slate-50">Kuromi Secret Base</h1>
              <p className="text-sm text-slate-200/85">私人基地，无注册入口，仅 RobinElysia 与 Meow 可管理。</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant={isAdmin ? "rose" : "muted"} className={isAdmin ? "border-rose-200/50" : "border-slate-100/25"}>
                {isAdmin ? "Admin" : "Visitor"}
              </Badge>
              <Badge className="border-cyan-200/35 bg-cyan-200/12 text-cyan-100">当前用户: {user.username}</Badge>
            </div>

            <Card className="rounded-2xl border-slate-100/15 bg-slate-900/45 p-4 shadow-none">
              <div className="space-y-3 text-sm text-slate-100/90">
                <p className="flex items-center gap-2">
                  <CalendarClock size={16} className="text-cyan-100" /> 建站时间: 2026-03-08
                </p>
                <p className="flex items-center gap-2">
                  <Clock3 size={16} className="text-cyan-100" /> 运行时间: {runtimeText}
                </p>
                <p className="leading-7 text-slate-200/80">
                  站点公告: <br></br>
                  欢迎来到 Kuromi Site。
                </p>
              </div>
            </Card>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <Button onClick={onChangeWallpaper} variant="cyan" title="切换壁纸">
                切换壁纸
              </Button>
              <Button onClick={onLogout} variant="rose" title="退出登录">
                退出登录
              </Button>
            </div>

            {isAdmin && (
              <Button type="button" onClick={onOpenEditor} className="w-full">
                <Crown size={16} className="mr-2" /> 进入帖子编辑页
              </Button>
            )}
          </div>
        </Card>

        <main className="relative pl-6 sm:pl-12">
          <div className="pointer-events-none absolute bottom-0 left-2 top-0 w-[2px] rounded-full bg-gradient-to-b from-rose-300/80 via-cyan-200/65 to-cyan-300/35 shadow-[0_0_24px_rgba(34,211,238,0.35)] sm:left-4" />
          <div className="space-y-5">
            {filteredPosts.map((post) => (
              <article key={post.id} className="relative">
                <div className="absolute left-2 top-7 h-3.5 w-3.5 -translate-x-1/2 rounded-full border border-white/60 bg-slate-50 shadow-[0_0_16px_rgba(255,255,255,0.7)] sm:left-4" />
                <Card className="overflow-hidden">
                  <div className="h-1.5 bg-gradient-to-r from-rose-300/85 via-orange-300/75 to-cyan-300/85" />
                  <CardContent className="p-6">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-300 to-cyan-200 font-bold text-slate-900">
                          {post.author.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-lg text-slate-50">{resolvePostTitle(post)}</h3>
                          <p className="text-xs text-slate-300/70">
                            {post.author} · {formatDateTime(post.createdAt)}
                          </p>
                        </div>
                      </div>
                      <Button type="button" variant="cyan" size="sm" onClick={() => onOpenPost(post.id)}>
                        <FileText size={14} className="mr-1.5" /> 查看详情
                      </Button>
                    </div>

                    <div className="mb-3 flex flex-wrap gap-2">
                      {(post.tags ?? []).map((tag) => (
                        <Badge key={`${post.id}-${tag}`}>#{tag}</Badge>
                      ))}
                      {(post.tags ?? []).length === 0 && <Badge variant="muted">#未分类</Badge>}
                    </div>

                    <p
                      className="overflow-hidden text-sm leading-7 text-slate-200/90"
                      style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}
                    >
                      {toExcerpt(post.content)}
                    </p>
                  </CardContent>
                </Card>
              </article>
            ))}

            {filteredPosts.length === 0 && (
              <Card className="py-14 text-center text-slate-200/75">
                <p className="mb-2 inline-flex items-center gap-2 text-base text-slate-100">
                  <Sparkles size={16} className="text-cyan-200" /> 没有匹配的帖子
                </p>
                <p className="text-sm text-slate-300/75">可以尝试更换关键词，或回到主页查看全部。</p>
              </Card>
            )}
          </div>
        </main>

        <aside className="p-2 lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)]">
          <p className="text-center text-xs tracking-[0.24em] text-slate-100/90">LINE SCROLL</p>
          <p className="mt-2 text-center text-xs text-slate-200/85">拖拽光点或点击刻度快速跳转页面</p>

          <div className="mt-6 flex justify-center">
            <div ref={barRef} onPointerDown={handleBarPointerDown} className="relative w-12" role="presentation" style={{ height: `${railHeight}px` }}>
              <div className="absolute bottom-0 left-1/2 top-0 w-[3px] -translate-x-1/2 rounded-full bg-slate-200/20" />
              <div
                className="absolute left-1/2 top-0 w-[3px] -translate-x-1/2 rounded-full bg-gradient-to-b from-rose-300/80 via-orange-200/70 to-cyan-300/85 shadow-[0_0_20px_rgba(251,113,133,0.48)]"
                style={{ height: `${dotY}px` }}
              />

              {[0, 0.2, 0.4, 0.6, 0.8, 1].map((mark) => (
                <button
                  key={mark}
                  type="button"
                  onClick={() => scrollToRatio(mark)}
                  className="absolute left-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/50 bg-slate-100/55 transition hover:scale-110"
                  style={{ top: `${mark * railHeight}px` }}
                  aria-label={`滚动到 ${Math.round(mark * 100)}%`}
                />
              ))}

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
                className={`absolute left-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/70 bg-white/35 shadow-[0_0_30px_rgba(255,255,255,0.46)] backdrop-blur-xl outline-none transition ${
                  isDraggingDot ? "scale-110" : "acrylic-dot"
                }`}
                style={{ top: `${dotY}px` }}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
