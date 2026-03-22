import React, { useEffect, useState } from "react";

const BRAND_MARK = new URL("../public/kuromi/1x1/logo.svg", import.meta.url).href;

export default function LoadingScreen() {
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setProgress((prev) => Math.min(prev + 6, 100));
    }, 120);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-3xl border border-rose-200/30 bg-slate-950/74 p-8 shadow-[0_24px_80px_rgba(12,19,31,0.6)] backdrop-blur-md">
        <div className="mb-5 flex items-center justify-center">
          <img src={BRAND_MARK} alt="Kuromi mark" className="h-16 w-auto" />
        </div>

        <p className="text-center text-sm tracking-[0.26em] text-rose-100/85">SECRET BASE BOOTING</p>
        <p className="mt-2 text-center text-xs text-slate-300/80">Loading visual assets and memory fragments…</p>

        <div className="mt-7 h-2.5 overflow-hidden rounded-full bg-slate-800/80">
          <div
            className="h-full rounded-full bg-gradient-to-r from-rose-400 via-orange-300 to-cyan-300 transition-[width] duration-200"
            style={{ width: `${progress}%` }}
            aria-hidden="true"
          />
        </div>

        <p className="mt-3 text-right text-xs text-cyan-100/85">{progress}%</p>
      </div>
    </div>
  );
}
