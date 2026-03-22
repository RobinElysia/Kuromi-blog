import React, { useState } from "react";
import { User } from "../types";

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();

      if (data.success) {
        onLogin({ username: data.user, role: data.role });
      } else {
        setError(data.message || "账号或密码错误");
      }
    } catch {
      setError("网络错误，请稍后重试");
    }
  };

  const handleGuestLogin = () => {
    onLogin({ username: "访客", role: "guest" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-rose-200/30 bg-slate-950/72 p-8 shadow-[0_25px_80px_rgba(12,18,30,0.6)] backdrop-blur-md">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-rose-400 via-orange-300 to-cyan-300" />

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full border-2 border-rose-200/60 bg-slate-900/80 text-rose-200 shadow-[0_0_25px_rgba(251,113,133,0.45)]">
            <span className="text-4xl leading-none">♠</span>
          </div>

          <h1 className="bg-gradient-to-r from-rose-100 via-orange-100 to-cyan-100 bg-clip-text text-3xl font-bold tracking-wide text-transparent">
            Meow And Elysia&apos;s Secret Base
          </h1>
          <p className="mt-2 text-sm text-slate-200/80">仅 RobinElysia / Meow 可管理登录，无注册入口，支持访客模式</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300/85">@</span>
            <input
              type="text"
              placeholder="账号"
              aria-label="账号"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-slate-200/30 bg-slate-900/70 py-3 pl-11 pr-4 text-slate-50 placeholder:text-slate-300/55 outline-none transition focus:border-cyan-200/65 focus:ring-1 focus:ring-cyan-200/65"
            />
          </div>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300/85">*</span>
            <input
              type="password"
              placeholder="密码"
              aria-label="密码"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200/30 bg-slate-900/70 py-3 pl-11 pr-4 text-slate-50 placeholder:text-slate-300/55 outline-none transition focus:border-cyan-200/65 focus:ring-1 focus:ring-cyan-200/65"
            />
          </div>

          {error && <p className="text-center text-sm text-rose-300">{error}</p>}

          <div className="space-y-3 pt-1">
            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-rose-400 via-orange-300 to-cyan-300 py-3 font-semibold text-slate-900 shadow-[0_8px_24px_rgba(251,113,133,0.4)] transition active:scale-[0.98]"
            >
              登录
            </button>

            <button
              type="button"
              onClick={handleGuestLogin}
              className="w-full rounded-xl border border-slate-200/35 bg-slate-900/35 py-3 font-medium text-slate-100 transition hover:bg-slate-800/45 active:scale-[0.98]"
            >
              访客进入
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
