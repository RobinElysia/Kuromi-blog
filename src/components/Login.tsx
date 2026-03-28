import React, { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, UserCircle2 } from "lucide-react";
import { User } from "../types";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";

interface LoginProps {
  onLogin: (user: User) => void;
}

const HERO_IMAGE = new URL("../public/kuromi/16x9/kv_krm.png", import.meta.url).href;
const DECO_ABOUT = new URL("../public/kuromi/16x9/bg_about.png", import.meta.url).href;
const DECO_MUSIC = new URL("../public/kuromi/16x9/bg_music.png", import.meta.url).href;
const DECO_MOVIES = new URL("../public/kuromi/16x9/bg_movies.png", import.meta.url).href;
const STICKER_1 = new URL("../public/kuromi/1x1/gotop_1.png", import.meta.url).href;
const STICKER_2 = new URL("../public/kuromi/1x1/gotop_2.png", import.meta.url).href;

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
    <div className="mx-auto flex min-h-screen w-full max-w-[1280px] items-center px-4 py-8 sm:px-6 lg:px-10">
      <div className="grid w-full gap-6 lg:grid-cols-[1.15fr_minmax(360px,460px)]">
        <Card className="relative hidden overflow-hidden border-rose-200/25 bg-slate-950/55 lg:flex lg:min-h-[640px]">
          <img
            src={HERO_IMAGE}
            alt="Kuromi Hero"
            className="absolute inset-0 h-full w-full object-cover object-center opacity-70"
            loading="eager"
            decoding="async"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_28%,rgba(244,114,182,0.28),transparent_48%),radial-gradient(circle_at_76%_65%,rgba(34,211,238,0.26),transparent_52%),linear-gradient(145deg,rgba(2,6,23,0.78),rgba(2,6,23,0.56))]" />

          <motion.img
            src={STICKER_1}
            alt=""
            aria-hidden="true"
            className="absolute bottom-6 right-6 h-20 w-20 opacity-95"
            animate={{ y: [0, -8, 0], rotate: [0, 2, 0] }}
            transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
          />

          <motion.img
            src={STICKER_2}
            alt=""
            aria-hidden="true"
            className="absolute right-28 top-8 h-16 w-16 opacity-90"
            animate={{ y: [0, 6, 0], rotate: [0, -2, 0] }}
            transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: 0.35 }}
          />

          <CardContent className="relative z-10 mt-auto space-y-5 p-8">
            <Badge variant="rose" className="w-fit border-rose-200/45 bg-rose-200/15 text-rose-100">
              RobinElysia · Meow Only
            </Badge>
            <h1 className="text-4xl leading-tight text-slate-50">Kuromi Secret Base</h1>
            <p className="max-w-xl text-sm leading-7 text-slate-100/85">
              这是两人私密基地，没有注册入口。管理员账号仅限 RobinElysia 与 Meow，其他访客可通过访客模式浏览内容。
            </p>

            <div className="grid grid-cols-3 gap-2 pt-1">
              {[DECO_ABOUT, DECO_MUSIC, DECO_MOVIES].map((item, index) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 + index * 0.08, duration: 0.35 }}
                  className="overflow-hidden rounded-xl border border-slate-100/20"
                >
                  <img src={item} alt="" aria-hidden="true" className="h-16 w-full object-cover" loading="lazy" decoding="async" />
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        <motion.div initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35 }}>
          <Card className="overflow-hidden border-slate-100/25 bg-slate-950/72">
            <CardHeader className="space-y-3 border-b border-slate-100/10 bg-slate-900/35">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-200/50 bg-slate-900/70 text-rose-100">
                  <Sparkles size={20} />
                </div>
                <div>
                  <CardTitle className="text-2xl text-slate-50">登录基地</CardTitle>
                  <CardDescription className="text-slate-200/80">仅管理员可写入，访客可浏览。</CardDescription>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <Badge className="bg-cyan-200/12 text-cyan-100">无注册入口</Badge>
                <Badge variant="muted" className="border-slate-100/25">访客模式可用</Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 p-6 sm:p-8">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="username" className="text-xs tracking-[0.14em] text-slate-200/85">
                    ACCOUNT
                  </label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="账号"
                    aria-label="账号"
                    name="username"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-11 rounded-xl border-slate-100/25"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-xs tracking-[0.14em] text-slate-200/85">
                    PASSWORD
                  </label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="密码"
                    aria-label="密码"
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-xl border-slate-100/25"
                  />
                </div>

                {error ? <p className="text-sm text-rose-300">{error}</p> : <p className="text-sm text-slate-300/70">请输入管理员账号或选择访客模式。</p>}

                <div className="space-y-3 pt-1">
                  <Button type="submit" className="h-11 w-full text-base">
                    管理员登录
                  </Button>

                  <Button
                    type="button"
                    onClick={handleGuestLogin}
                    variant="ghost"
                    className="h-11 w-full border-slate-100/30 text-sm text-slate-100"
                  >
                    <UserCircle2 size={16} className="mr-2" />
                    访客进入
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
