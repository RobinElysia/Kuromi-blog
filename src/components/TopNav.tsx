import React from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";

const LOGO = new URL("../public/kuromi/1x1/logo.svg", import.meta.url).href;
const KUROMI_STICKER = new URL("../public/kuromi/1x1/gotop_3.png", import.meta.url).href;

interface TopNavProps {
  currentPath: string;
  search: string;
  onSearchChange: (value: string) => void;
  onNavigate: (path: string) => void;
}

const NAV_ITEMS = [
  { label: "主页", path: "/" },
  { label: "标签", path: "/tags" },
  { label: "友链", path: "/friends" },
];

function isActive(currentPath: string, targetPath: string) {
  if (targetPath === "/") return currentPath === "/" || currentPath === "/home";
  return currentPath === targetPath;
}

export default function TopNav({ currentPath, search, onSearchChange, onNavigate }: TopNavProps) {
  const handleNavClick = (event: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    event.preventDefault();
    onNavigate(path);
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-100/15 bg-slate-950/55 backdrop-blur-xl">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <motion.a
            href="/"
            onClick={(event) => handleNavClick(event, "/")}
            className="group flex min-w-[220px] items-center gap-3"
            whileHover={{ y: -1.5 }}
            transition={{ duration: 0.2 }}
          >
            <img src={LOGO} alt="logo" className="h-10 w-10 transition group-hover:scale-105" />
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-50">RobinElysia & Meow</p>
              <p className="font-kuromi-script text-lg leading-none text-cyan-100/90">Kuromi Secret Base</p>
            </div>
          </motion.a>

          <div className="flex flex-1 flex-wrap items-center justify-end gap-2 md:gap-3">
            <div className="relative w-full min-w-[190px] max-w-[300px]">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-200/70" />
              <Input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="搜索帖子、作者、内容"
                aria-label="站内模糊搜索"
                name="site_search"
                autoComplete="off"
                className="h-9 border-slate-100/20 bg-slate-900/50 pl-9 text-xs sm:text-sm"
              />
            </div>

            {NAV_ITEMS.map((item) => {
              const active = isActive(currentPath, item.path);
              return (
                <a
                  key={item.path}
                  href={item.path}
                  onClick={(event) => handleNavClick(event, item.path)}
                  className={`relative overflow-hidden rounded-xl border px-3 py-2 text-xs transition sm:text-sm ${
                    active
                      ? "border-cyan-200/35 bg-gradient-to-r from-rose-300/35 via-orange-300/25 to-cyan-300/35 text-slate-50"
                      : "border-slate-100/12 bg-slate-900/45 text-slate-200/75 hover:bg-slate-800/60"
                  }`}
                >
                  {item.label}
                  {active && (
                    <motion.span
                      layoutId="nav-active-glow"
                      className="pointer-events-none absolute inset-0 rounded-xl border border-cyan-100/25"
                      transition={{ type: "spring", stiffness: 460, damping: 35 }}
                    />
                  )}
                </a>
              );
            })}

            <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }} className="hidden lg:block">
              <Badge variant="muted" className="border-slate-100/25 bg-slate-900/60 text-slate-200/80">
                <img src={KUROMI_STICKER} alt="" aria-hidden="true" className="mr-1 h-4 w-4" />
                Visitor Mode Ready
              </Badge>
            </motion.div>
          </div>
        </div>
      </div>
    </header>
  );
}
