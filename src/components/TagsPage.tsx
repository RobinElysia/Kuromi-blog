import React, { useEffect, useMemo, useRef, useState } from "react";
import "animate.css";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AudioLines, Hash, Sparkles, Tag, UserRound, Waves } from "lucide-react";
import type { Post } from "../types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface TagsPageProps {
  search: string;
  queryString: string;
  onNavigate: (path: string) => void;
  onOpenPost: (postId: number) => void;
}

type TagTabValue = "constellation" | "dispatch";

const BANNER = new URL("../public/kuromi/16x9/kv_krm.png", import.meta.url).href;
const STAR_STICKER = new URL("../public/kuromi/1x1/gotop_1.png", import.meta.url).href;
const STAR_STICKER_ALT = new URL("../public/kuromi/1x1/gotop_2.png", import.meta.url).href;
const AXIS_KNOB_SIZE = 24;

const TAB_ITEMS: { value: TagTabValue; label: string; caption: string }[] = [
  { value: "constellation", label: "旧史trails", caption: "轴控卡组 · Hover 上浮 · Click 翻转" },
  { value: "dispatch", label: "记忆派送", caption: "对应trails的帖子详情联动" },
];

function resolvePostTitle(post: Post) {
  const title = post.title?.trim();
  if (title) return title;
  const fallback = post.content?.replace(/\s+/g, " ").trim().slice(0, 24);
  return fallback || "无标题帖子";
}

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase();
}

function readTagFromQuery(queryString: string) {
  const params = new URLSearchParams(queryString);
  return params.get("tag")?.trim() ?? "";
}

function buildTagPath(tag: string) {
  return tag ? `/tags?tag=${encodeURIComponent(tag)}` : "/tags";
}

function clamp(num: number, min: number, max: number) {
  return Math.min(max, Math.max(min, num));
}

export default function TagsPage({ search, queryString, onNavigate, onOpenPost }: TagsPageProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState(() => readTagFromQuery(queryString));
  const [activeTab, setActiveTab] = useState<TagTabValue>("constellation");
  const [axisProgress, setAxisProgress] = useState(0.5);
  const [hoveredTag, setHoveredTag] = useState("");
  const [flippingTag, setFlippingTag] = useState("");
  const shouldReduceMotion = useReducedMotion();
  const railRef = useRef<HTMLDivElement>(null);
  const flipTimerRef = useRef<number | undefined>(undefined);
  const wheelRemainderRef = useRef(0);
  const deckDragRef = useRef<{ pointerId: number; startX: number; startProgress: number; moved: boolean } | null>(null);
  const suppressClickUntilRef = useRef(0);

  useEffect(() => {
    return () => {
      if (flipTimerRef.current) {
        window.clearTimeout(flipTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setSelectedTag(readTagFromQuery(queryString));
  }, [queryString]);

  useEffect(() => {
    let aborted = false;

    async function loadPosts() {
      setLoading(true);
      try {
        const response = await fetch("/api/posts?limit=30");
        if (!response.ok || aborted) return;
        const data = (await response.json()) as Post[];
        if (!aborted) setPosts(data);
      } catch (err) {
        console.error("Failed to fetch posts for tags page:", err);
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    loadPosts();
    return () => {
      aborted = true;
    };
  }, []);

  const filteredBySearch = useMemo(() => {
    const keyword = normalizeSearchText(search);
    if (!keyword) return posts;

    return posts.filter((post) => {
      const composite = `${resolvePostTitle(post)} ${post.author} ${post.content} ${(post.tags ?? []).join(" ")}`.toLowerCase();
      return composite.includes(keyword);
    });
  }, [posts, search]);

  const allTagStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const post of filteredBySearch) {
      for (const tag of post.tags ?? []) {
        map.set(tag, (map.get(tag) ?? 0) + 1);
      }
    }
    return [...map.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => (b.count === a.count ? a.tag.localeCompare(b.tag, "zh-CN") : b.count - a.count));
  }, [filteredBySearch]);

  const selectedTagExists = allTagStats.some((item) => item.tag === selectedTag);
  const activeTag = selectedTagExists ? selectedTag : "";
  const topTag = allTagStats[0] ?? null;

  const activePosts = useMemo(() => {
    if (!activeTag) return filteredBySearch;
    return filteredBySearch.filter((post) => (post.tags ?? []).includes(activeTag));
  }, [filteredBySearch, activeTag]);

  const axisIndex = useMemo(() => {
    if (allTagStats.length === 0) return 0;
    return Math.round(axisProgress * (allTagStats.length - 1));
  }, [allTagStats.length, axisProgress]);

  useEffect(() => {
    if (!activeTag) return;
    const index = allTagStats.findIndex((item) => item.tag === activeTag);
    if (index < 0 || allTagStats.length <= 1) return;
    setAxisProgress(index / (allTagStats.length - 1));
  }, [activeTag, allTagStats]);

  const focusTag = hoveredTag || flippingTag || allTagStats[axisIndex]?.tag || activeTag || topTag?.tag || "";

  const handlePickTag = (tag: string) => {
    const nextTag = activeTag === tag ? "" : tag;
    setSelectedTag(nextTag);
    onNavigate(buildTagPath(nextTag));
  };

  const handleActivateTag = (tag: string) => {
    setSelectedTag(tag);
    onNavigate(buildTagPath(tag));
  };

  const moveAxisByClientY = (clientY: number) => {
    if (!railRef.current) return;
    const rect = railRef.current.getBoundingClientRect();
    const effectiveHeight = Math.max(rect.height - AXIS_KNOB_SIZE, 1);
    const ratio = clamp((clientY - rect.top - AXIS_KNOB_SIZE / 2) / effectiveHeight, 0, 1);
    setAxisProgress(ratio);
  };

  const shiftAxisByStep = (step: number) => {
    if (!step || allTagStats.length <= 1) return;
    const maxIndex = allTagStats.length - 1;
    const currentIndex = Math.round(axisProgress * maxIndex);
    const nextIndex = clamp(currentIndex + step, 0, maxIndex);
    setAxisProgress(nextIndex / maxIndex);
  };

  const handleAxisWheel = (deltaX: number, deltaY: number) => {
    if (allTagStats.length <= 1) return;
    const primaryDelta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
    if (primaryDelta === 0) return;
    wheelRemainderRef.current += primaryDelta;
    const threshold = 36;
    const steps = Math.trunc(wheelRemainderRef.current / threshold);
    if (steps === 0) return;
    wheelRemainderRef.current -= steps * threshold;
    shiftAxisByStep(steps);
  };

  const handleCardDeckPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (allTagStats.length <= 1) return;
    if (event.button !== 0) return;
    deckDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startProgress: axisProgress,
      moved: false,
    };
  };

  const handleCardDeckPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = deckDragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId || allTagStats.length <= 1) return;
    const deltaX = event.clientX - dragState.startX;
    if (Math.abs(deltaX) > 8) {
      dragState.moved = true;
    }
    const progressDelta = -(deltaX / 64) / (allTagStats.length - 1);
    setAxisProgress(clamp(dragState.startProgress + progressDelta, 0, 1));
  };

  const handleCardDeckPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = deckDragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    if (dragState.moved) {
      suppressClickUntilRef.current = Date.now() + 120;
      if (allTagStats.length > 1) {
        const maxIndex = allTagStats.length - 1;
        const snappedIndex = Math.round(axisProgress * maxIndex);
        setAxisProgress(snappedIndex / maxIndex);
      }
    }
    deckDragRef.current = null;
  };

  const handleFlipToTag = (tag: string) => {
    if (Date.now() < suppressClickUntilRef.current) return;
    if (flippingTag) return;
    setFlippingTag(tag);
    flipTimerRef.current = window.setTimeout(() => {
      handleActivateTag(tag);
      setActiveTab("dispatch");
      setFlippingTag("");
    }, shouldReduceMotion ? 120 : 560);
  };

  const waveTitle = "trails".split("");

  return (
    <div className="mx-auto min-h-screen w-full max-w-[1550px] p-4 sm:p-6 lg:p-8">
      <div className="space-y-5">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="relative min-h-[240px] overflow-hidden p-6 sm:p-8">
              <img src={BANNER} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover object-center opacity-35" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_20%,rgba(251,113,133,0.32),transparent_44%),radial-gradient(circle_at_84%_68%,rgba(34,211,238,0.26),transparent_42%),linear-gradient(165deg,rgba(2,6,23,0.68),rgba(2,6,23,0.9))]" />
              <motion.img
                src={STAR_STICKER}
                alt=""
                aria-hidden="true"
                className="absolute right-4 top-4 h-16 w-16 opacity-95 sm:h-20 sm:w-20"
                animate={shouldReduceMotion ? undefined : { y: [0, -7, 0], rotate: [0, 4, 0] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              />

              <div className="relative z-10 space-y-3">
                <Badge variant="muted" className="w-fit tracking-[0.18em]">
                  KUROMI TAG STUDIO
                </Badge>
                <h2 className="animate__animated animate__fadeInDown text-3xl sm:text-4xl">
                  <span className="bg-gradient-to-r from-rose-100 via-orange-100 to-cyan-100 bg-clip-text text-transparent">
                    {waveTitle.map((char, index) => (
                      <motion.span
                        key={`${char}-${index}`}
                        className="inline-block"
                        animate={shouldReduceMotion ? undefined : { y: [0, -4, 0] }}
                        transition={{ duration: 2, delay: index * 0.05, repeat: Infinity, repeatDelay: 0.1 }}
                      >
                        {char}
                      </motion.span>
                    ))}
                  </span>
                </h2>
                <p className="max-w-3xl text-sm leading-7 text-slate-100/90">
                  我们没有注册入口，因为这里只有 RobinElysia 与 Meow 两位管理员；访客可通过 Visitor Mode 浏览内容。当前trails页采用可拖拽轴控和翻转卡组结构。
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Badge className="border-cyan-200/35 bg-cyan-200/12 text-cyan-100">
                    <Hash size={12} className="mr-1" />
                    trails数 {allTagStats.length}
                  </Badge>
                  <Badge variant="rose">
                    <Sparkles size={12} className="mr-1" />
                    联动帖子 {activePosts.length}
                  </Badge>
                  {topTag && (
                    <Badge className="border-fuchsia-200/35 bg-fuchsia-200/12 text-fuchsia-100">
                      <Tag size={12} className="mr-1" />
                      热门 #{topTag.tag}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TagTabValue)} className="w-full">
              <TabsList className="mb-4 grid h-auto w-full grid-cols-1 gap-2 bg-transparent p-0 sm:grid-cols-2">
                {TAB_ITEMS.map((item) => (
                  <TabsTrigger
                    key={item.value}
                    value={item.value}
                    className="h-auto rounded-xl border border-slate-100/15 bg-slate-900/45 px-4 py-3 text-left data-[state=active]:border-cyan-200/45 data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-300/22 data-[state=active]:via-orange-300/14 data-[state=active]:to-cyan-300/25"
                  >
                    <span className="block text-sm text-slate-50">{item.label}</span>
                    <span className="block text-xs text-slate-300/80">{item.caption}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="constellation" className="mt-0">
                {loading ? (
                  <div className="grid gap-4 lg:grid-cols-[120px_1fr]">
                    <div className="h-[420px] rounded-2xl border border-slate-100/15 bg-slate-900/50" />
                    <div className="relative grid min-h-[420px] place-items-center overflow-hidden rounded-2xl border border-slate-100/15 bg-slate-900/45">
                      {Array.from({ length: 4 }, (_, idx) => (
                        <motion.div
                          key={idx}
                          className="absolute h-56 w-44 rounded-2xl border border-slate-100/20 bg-slate-800/60"
                          animate={shouldReduceMotion ? undefined : { y: [0, -6, 0], opacity: [0.35, 0.7, 0.35] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: idx * 0.08 }}
                          style={{ transform: `translateX(${(idx - 1.5) * 36}px) rotate(${(idx - 1.5) * 8}deg)` }}
                        />
                      ))}
                    </div>
                  </div>
                ) : allTagStats.length === 0 ? (
                  <div className="rounded-2xl border border-slate-100/15 bg-slate-900/55 p-5 text-sm text-slate-200/85">当前没有可展示的trails。</div>
                ) : (
                  <div className="grid gap-4 lg:grid-cols-[120px_1fr]">
                    <div className="relative rounded-2xl border border-slate-100/15 bg-slate-950/45 p-3 backdrop-blur-sm">
                      <div
                        ref={railRef}
                        className="relative mx-auto h-[420px] w-10 rounded-full border border-slate-100/20 bg-slate-950/80"
                        onPointerDown={(event) => {
                          if ((event.target as HTMLElement).closest("button")) return;
                          moveAxisByClientY(event.clientY);
                        }}
                        onWheel={(event) => {
                          event.preventDefault();
                          handleAxisWheel(event.deltaX, event.deltaY);
                        }}
                      >
                        <div className="absolute inset-x-1 top-2 bottom-2 rounded-full bg-gradient-to-b from-cyan-300/25 via-fuchsia-300/25 to-rose-300/25 blur-[1px]" />
                        <motion.button
                          type="button"
                          className="absolute left-1/2 h-6 w-6 -translate-x-1/2 rounded-full border border-cyan-100/70 bg-cyan-100/30 shadow-[0_0_16px_rgba(103,232,249,0.55)]"
                          style={{ top: `calc(${axisProgress} * (100% - ${AXIS_KNOB_SIZE}px))` }}
                          drag={shouldReduceMotion ? false : "y"}
                          dragConstraints={railRef}
                          dragElastic={0}
                          dragMomentum={false}
                          onDrag={(_, info) => moveAxisByClientY(info.point.y)}
                          whileTap={shouldReduceMotion ? undefined : { scale: 1.08 }}
                          aria-label="拖拽滚动轴切换trails焦点"
                        />
                      </div>
                      <p className="mt-3 text-center text-xs text-slate-300/75">Drag Axis</p>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl border border-slate-100/15 bg-slate-900/40 p-4 backdrop-blur-sm sm:p-6">
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(244,114,182,0.18),transparent_42%),radial-gradient(circle_at_82%_80%,rgba(34,211,238,0.18),transparent_44%)]" />
                      {!shouldReduceMotion && (
                        <div className="pointer-events-none absolute inset-0">
                          {Array.from({ length: 18 }, (_, idx) => (
                            <motion.span
                              key={`dust-${idx}`}
                              className="absolute h-1 w-1 rounded-full bg-cyan-100/65"
                              style={{ left: `${8 + (idx * 5) % 84}%`, top: `${15 + (idx * 7) % 70}%` }}
                              animate={{ opacity: [0.2, 0.8, 0.2], scale: [0.7, 1.4, 0.7] }}
                              transition={{ duration: 2.8 + (idx % 6) * 0.3, repeat: Infinity, delay: idx * 0.08 }}
                            />
                          ))}
                        </div>
                      )}

                      <div className="relative z-10 flex items-center justify-between gap-2">
                        <p className="text-xs tracking-[0.18em] text-slate-300/75">KUROMI AXIS DECK</p>
                        <Badge variant="muted" className="border-cyan-200/30 bg-cyan-200/12 text-cyan-100">
                          焦点 #{focusTag || "全部"}
                        </Badge>
                      </div>

                      <div
                        className="relative mt-5 grid min-h-[360px] cursor-grab place-items-center [perspective:1200px] active:cursor-grabbing"
                        onPointerDown={handleCardDeckPointerDown}
                        onPointerMove={handleCardDeckPointerMove}
                        onPointerUp={handleCardDeckPointerUp}
                        onPointerCancel={handleCardDeckPointerUp}
                        onWheel={(event) => {
                          event.preventDefault();
                          handleAxisWheel(event.deltaX, event.deltaY);
                        }}
                      >
                        {allTagStats.map((item, index) => {
                          const delta = index - axisIndex;
                          const absDelta = Math.abs(delta);
                          const isFocused = item.tag === focusTag;
                          const isFlipping = item.tag === flippingTag;
                          const lift = hoveredTag === item.tag ? -24 : isFocused ? -12 : 0;

                          return (
                            <motion.button
                              key={item.tag}
                              type="button"
                              onClick={() => handleFlipToTag(item.tag)}
                              onMouseEnter={() => setHoveredTag(item.tag)}
                              onMouseLeave={() => setHoveredTag("")}
                              className="absolute h-60 w-44 rounded-2xl text-left outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
                              style={{ zIndex: 120 - absDelta }}
                              animate={{
                                x: delta * 56,
                                y: absDelta * 7 + lift,
                                rotateZ: delta * 6,
                                scale: isFlipping ? 1.12 : 1 - absDelta * 0.045,
                                opacity: absDelta > 5 ? 0 : 1,
                              }}
                              transition={{ type: "spring", stiffness: 180, damping: 18 }}
                              whileHover={shouldReduceMotion ? undefined : { y: absDelta * 7 + lift - 6, scale: 1.02 }}
                            >
                              <motion.div
                                className="relative h-full w-full rounded-2xl [transform-style:preserve-3d]"
                                animate={{ rotateY: isFlipping ? 180 : 0 }}
                                transition={{ duration: shouldReduceMotion ? 0.15 : 0.48, ease: "easeInOut" }}
                              >
                                <div className="absolute inset-0 rounded-2xl border border-slate-100/25 bg-gradient-to-b from-slate-900/90 to-slate-950/95 p-4 shadow-[0_20px_45px_rgba(8,15,30,0.55)] [backface-visibility:hidden]">
                                  <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_20%_18%,rgba(244,114,182,0.22),transparent_45%),radial-gradient(circle_at_88%_82%,rgba(34,211,238,0.2),transparent_48%)]" />
                                  <div className="relative z-10 flex h-full flex-col justify-between">
                                    <div>
                                      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-300/70">Theme Card</p>
                                      <p className="mt-2 text-xl text-slate-50">#{item.tag}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-300/90">{item.count} 篇帖子</p>
                                      <p className="mt-1 text-[11px] text-cyan-100/90">Hover 抬升 / Click 翻转</p>
                                    </div>
                                  </div>
                                </div>
                                <div className="absolute inset-0 rounded-2xl border border-cyan-100/40 bg-gradient-to-br from-cyan-300/25 to-fuchsia-300/20 p-4 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                                  <div className="flex h-full flex-col justify-between">
                                    <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-50/85">Ready</p>
                                    <p className="text-lg text-slate-50">进入 #{item.tag}</p>
                                    <p className="text-xs text-slate-100/85">正在切换到记忆派送...</p>
                                  </div>
                                </div>
                              </motion.div>
                            </motion.button>
                          );
                        })}
                      </div>

                      <div className="relative z-10 mt-4 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-xl border border-slate-100/15 bg-slate-900/55 p-3 text-xs text-slate-200/85">
                          <p className="flex items-center gap-2 text-slate-100">
                            <UserRound size={12} className="text-cyan-100" />
                            Visitor mode 已启用
                          </p>
                          <p className="mt-1">仅浏览与筛选，不提供注册入口。</p>
                        </div>
                        <div className="rounded-xl border border-slate-100/15 bg-slate-900/55 p-3 text-xs text-slate-200/85">
                          <p className="flex items-center gap-2 text-slate-100">
                            <Waves size={12} className="text-cyan-100" />
                            轴控提示
                          </p>
                          <p className="mt-1">拖拽左侧滚动轴可快速改变卡组焦点。</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="dispatch" className="mt-0 space-y-3">
                <div className="rounded-2xl border border-slate-100/15 bg-slate-900/55 p-3 text-xs text-slate-300/85">
                  <p className="flex items-center gap-2 text-slate-100/95">
                    <AudioLines size={13} className="text-cyan-100" />
                    当前trails：{activeTag ? `#${activeTag}` : "全部"}。点击卡片后会自动进入这里。
                  </p>
                </div>

                <AnimatePresence mode="popLayout">
                  {activePosts.map((post, index) => {
                    const title = resolvePostTitle(post);
                    return (
                      <motion.article
                        key={post.id}
                        layout
                        initial={shouldReduceMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
                        animate={shouldReduceMotion ? {} : { opacity: 1, y: 0, scale: 1 }}
                        exit={shouldReduceMotion ? {} : { opacity: 0, y: -8, scale: 0.98 }}
                        transition={{ duration: 0.22, delay: shouldReduceMotion ? 0 : index * 0.014 }}
                        whileHover={shouldReduceMotion ? undefined : { y: -3, rotateX: 1, rotateY: index % 2 === 0 ? 0.5 : -0.5 }}
                        className="group relative rounded-2xl border border-slate-100/15 bg-slate-900/55 p-4 [transform-style:preserve-3d]"
                        style={{ perspective: 1000 }}
                      >
                        <motion.div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_12%_10%,rgba(236,72,153,0.22),transparent_40%),radial-gradient(circle_at_88%_78%,rgba(34,211,238,0.22),transparent_48%)] opacity-0 transition group-hover:opacity-100"
                        />
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1 [transform:translateZ(12px)]">
                            <p className="text-base text-slate-50">{title}</p>
                            <p className="text-xs text-slate-300/80">{post.author}</p>
                          </div>
                          <Button type="button" size="sm" variant="cyan" onClick={() => onOpenPost(post.id)}>
                            查看详情
                          </Button>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(post.tags ?? []).map((tag) => (
                            <button key={`${post.id}-${tag}`} type="button" onClick={() => handlePickTag(tag)} className="rounded-full">
                              <Badge className={tag === activeTag ? "border-rose-200/40 bg-rose-200/20 text-rose-50" : ""}>#{tag}</Badge>
                            </button>
                          ))}
                          {(post.tags ?? []).length === 0 && <Badge variant="muted">#未分类</Badge>}
                        </div>
                      </motion.article>
                    );
                  })}
                </AnimatePresence>

                {!loading && activePosts.length === 0 && (
                  <div className="rounded-2xl border border-slate-100/15 bg-slate-900/55 p-5 text-sm text-slate-200/85">
                    没有匹配帖子，试试搜索框或切换trails。
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
