import React from "react";

const LOGO = new URL("../public/kuromi/1x1/logo.svg", import.meta.url).href;

interface TopNavProps {
  currentPath: string;
  search: string;
  onSearchChange: (value: string) => void;
  onNavigate: (path: string) => void;
}

const NAV_ITEMS = [
  { label: "主页", path: "/" },
  { label: "帖子", path: "/posts" },
  { label: "标签", path: "/tags" },
  { label: "友链", path: "/friends" },
];

function isActive(currentPath: string, targetPath: string) {
  if (targetPath === "/") return currentPath === "/" || currentPath === "/home";
  if (targetPath === "/posts") return currentPath === "/posts" || /^\/posts\/\d+$/.test(currentPath);
  return currentPath === targetPath;
}

export default function TopNav({ currentPath, search, onSearchChange, onNavigate }: TopNavProps) {
  const handleNavClick = (event: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    event.preventDefault();
    onNavigate(path);
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-100/10 bg-slate-950/58 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <a href="/" onClick={(event) => handleNavClick(event, "/")} className="flex items-center gap-3">
          <img src={LOGO} alt="logo" className="h-9 w-9" />
          <div className="text-left">
            <p className="bg-gradient-to-r from-rose-100 via-orange-100 to-cyan-100 bg-clip-text text-sm font-semibold text-transparent">
              Meow & Elysia
            </p>
            <p className="text-[11px] tracking-[0.18em] text-slate-200/75">SECRET BASE</p>
          </div>
        </a>

        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="模糊搜索…"
            aria-label="站内模糊搜索"
            name="site_search"
            autoComplete="off"
            className="h-9 w-28 rounded-xl border border-slate-200/20 bg-slate-900/55 px-3 text-base text-slate-100 placeholder:text-slate-300/60 outline-none ring-cyan-200/45 backdrop-blur-lg transition focus:w-36 focus:ring-1 sm:w-40 sm:text-sm"
          />

          {NAV_ITEMS.map((item) => (
            <a
              key={item.path}
              href={item.path}
              onClick={(event) => handleNavClick(event, item.path)}
              className={`rounded-xl px-3 py-2 text-xs transition sm:text-sm ${
                isActive(currentPath, item.path)
                  ? "bg-gradient-to-r from-rose-300/35 via-orange-300/25 to-cyan-300/35 text-slate-50"
                  : "bg-slate-900/45 text-slate-200/75 hover:bg-slate-800/60"
              }`}
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </header>
  );
}
