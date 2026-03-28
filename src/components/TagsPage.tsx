import React, { useEffect, useMemo, useState } from "react";
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

type TagStats = {
  tag: string;
  count: number;
};

type TagTabValue = "constellation" | "dispatch";

const BANNER = new URL("../public/kuromi/16x9/kv_krm.png", import.meta.url).href;
const STRIP_ABOUT = new URL("../public/kuromi/16x9/bg_about.png", import.meta.url).href;
const STRIP_MUSIC = new URL("../public/kuromi/16x9/bg_music.png", import.meta.url).href;
const STRIP_MOVIES = new URL("../public/kuromi/16x9/bg_movies.png", import.meta.url).href;
const STAR_STICKER = new URL("../public/kuromi/1x1/gotop_1.png", import.meta.url).href;
const ART_CTA = new URL("../public/kuromi/1x1/BNR_artist_EN.png", import.meta.url).href;

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

const TAB_ITEMS: { value: TagTabValue; label: string; caption: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  {
    value: "constellation",
    label: "标签星轨",
    caption: "浏览全部主题标签",
    icon: Waves,
  },
  {
    value: "dispatch",
    label: "帖子派送",
    caption: "按标签查看帖子联动",
    icon: AudioLines,
  },
];

export default function TagsPage({ search, queryString, onNavigate, onOpenPost }: TagsPageProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState(() => readTagFromQuery(queryString));
  const [activeTab, setActiveTab] = useState<TagTabValue>("constellation");
  const shouldReduceMotion = useReducedMotion();

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

  const handlePickTag = (tag: string) => {
    const nextTag = activeTag === tag ? "" : tag;
    setSelectedTag(nextTag);
    onNavigate(buildTagPath(nextTag));
  };

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
                <h2 className="animate__animated animate__fadeInDown bg-gradient-to-r from-rose-100 via-orange-100 to-cyan-100 bg-clip-text text-3xl text-transparent sm:text-4xl">
                  标签电波控制台
                </h2>
                <p className="max-w-3xl text-sm leading-7 text-slate-100/90">
                  标签页重新设计为创意操作台，支持在“标签星轨”和“帖子派送”之间快速切换。本站仅 RobinElysia 与 Meow 维护，无注册系统，访客模式可直接浏览内容。
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Badge className="border-cyan-200/35 bg-cyan-200/12 text-cyan-100">
                    <Hash size={12} className="mr-1" />
                    标签数 {allTagStats.length}
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

            <div className="relative z-10 grid grid-cols-1 gap-2 border-t border-slate-100/15 p-3 sm:grid-cols-4">
              {[STRIP_ABOUT, STRIP_MUSIC, STRIP_MOVIES, ART_CTA].map((item, index) => (
                <motion.div
                  key={item}
                  className="overflow-hidden rounded-xl border border-slate-100/15"
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, delay: shouldReduceMotion ? 0 : index * 0.05 }}
                >
                  <img src={item} alt="" aria-hidden="true" className="h-16 w-full object-cover sm:h-20" loading="lazy" decoding="async" />
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TagTabValue)} className="w-full">
              <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
                <div className="rounded-2xl border border-slate-100/15 bg-slate-950/40 p-3 backdrop-blur-sm">
                  <TabsList className="grid h-auto w-full grid-cols-1 gap-2 bg-transparent p-0">
                    {TAB_ITEMS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <TabsTrigger
                          key={item.value}
                          value={item.value}
                          className="group relative h-auto justify-start rounded-xl border border-slate-100/10 bg-slate-900/45 px-3 py-3 text-left data-[state=active]:border-cyan-200/45 data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-300/22 data-[state=active]:via-orange-300/14 data-[state=active]:to-cyan-300/25"
                        >
                          <div className="relative z-10 flex items-start gap-3">
                            <span className="mt-0.5 rounded-md border border-slate-100/20 bg-slate-800/50 p-1.5 text-cyan-100">
                              <Icon size={14} />
                            </span>
                            <span className="space-y-0.5">
                              <span className="block text-sm text-slate-50">{item.label}</span>
                              <span className="block text-xs text-slate-300/80">{item.caption}</span>
                            </span>
                          </div>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>

                  <div className="mt-3 rounded-xl border border-slate-100/10 bg-slate-900/45 p-3 text-xs leading-6 text-slate-200/80">
                    <p className="flex items-center gap-2 text-slate-100/95">
                      <UserRound size={13} className="text-cyan-100" />
                      Visitor mode enabled
                    </p>
                    <p className="mt-1">当前页面仅提供浏览与筛选，不涉及注册与登录入口。</p>
                  </div>

                  {activeTag && (
                    <Button type="button" variant="ghost" size="sm" className="mt-3 w-full" onClick={() => handlePickTag(activeTag)}>
                      清除当前筛选 #{activeTag}
                    </Button>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-100/15 bg-slate-950/30 p-4 sm:p-5 backdrop-blur-sm">
                  <TabsContent value="constellation" className="mt-0 space-y-4">
                    {loading ? (
                      <div className="rounded-2xl border border-slate-100/15 bg-slate-900/55 p-5 text-sm text-slate-200/85">正在加载标签...</div>
                    ) : allTagStats.length === 0 ? (
                      <div className="rounded-2xl border border-slate-100/15 bg-slate-900/55 p-5 text-sm text-slate-200/85">当前没有可展示的标签。</div>
                    ) : (
                      <>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {allTagStats.map((item, index) => {
                            const isActive = item.tag === activeTag;
                            return (
                              <motion.button
                                key={item.tag}
                                type="button"
                                onClick={() => handlePickTag(item.tag)}
                                className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition ${
                                  isActive
                                    ? "border-cyan-200/45 bg-gradient-to-br from-rose-300/25 via-orange-300/15 to-cyan-300/25 text-slate-50"
                                    : "border-slate-100/15 bg-slate-900/55 text-slate-100/90 hover:border-slate-100/30 hover:bg-slate-800/55"
                                }`}
                                initial={shouldReduceMotion ? false : { opacity: 0, y: 14, scale: 0.98 }}
                                animate={shouldReduceMotion ? {} : { opacity: 1, y: 0, scale: 1 }}
                                transition={{ duration: 0.25, delay: shouldReduceMotion ? 0 : index * 0.02 }}
                                whileHover={shouldReduceMotion ? undefined : { y: -3, scale: 1.01 }}
                                whileTap={shouldReduceMotion ? undefined : { scale: 0.99 }}
                              >
                                <motion.div
                                  aria-hidden="true"
                                  className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-cyan-200/20 blur-2xl"
                                  animate={shouldReduceMotion ? {} : { scale: [1, 1.12, 1], opacity: [0.14, 0.3, 0.14] }}
                                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: index * 0.08 }}
                                />
                                <p className="relative text-xs uppercase tracking-[0.14em] text-slate-100/65">Theme</p>
                                <p className="relative mt-1 flex items-center gap-1.5 text-lg text-slate-50">
                                  <Tag size={16} className="text-cyan-100" />
                                  #{item.tag}
                                </p>
                                <p className="relative mt-2 text-xs text-slate-200/85">{item.count} 篇帖子</p>
                              </motion.button>
                            );
                          })}
                        </div>

                        <div className="rounded-2xl border border-slate-100/15 bg-slate-900/55 p-4 text-sm text-slate-200/85">
                          当前焦点标签:
                          <span className="ml-2 rounded-full border border-cyan-200/35 bg-cyan-200/12 px-2 py-0.5 text-cyan-100">{activeTag ? `#${activeTag}` : "全部"}</span>
                        </div>
                      </>
                    )}
                  </TabsContent>

                  <TabsContent value="dispatch" className="mt-0 space-y-3">
                    <AnimatePresence mode="popLayout">
                      {activePosts.map((post, index) => (
                        <motion.article
                          key={post.id}
                          layout
                          initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
                          animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
                          exit={shouldReduceMotion ? {} : { opacity: 0, y: -8 }}
                          transition={{ duration: 0.22, delay: shouldReduceMotion ? 0 : index * 0.015 }}
                          className="rounded-2xl border border-slate-100/15 bg-slate-900/55 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1">
                              <p className="text-base text-slate-50">{resolvePostTitle(post)}</p>
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
                      ))}
                    </AnimatePresence>

                    {!loading && activePosts.length === 0 && (
                      <div className="rounded-2xl border border-slate-100/15 bg-slate-900/55 p-5 text-sm text-slate-200/85">
                        没有匹配帖子，试试搜索框或清除当前标签筛选。
                      </div>
                    )}
                  </TabsContent>
                </div>
              </div>
            </Tabs>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
