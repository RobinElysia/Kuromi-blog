import React, { useEffect, useMemo, useState } from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

interface MermaidBlockProps {
  chart: string;
}

let mermaidModulePromise: Promise<typeof import("mermaid")> | null = null;

function loadMermaid() {
  if (!mermaidModulePromise) {
    mermaidModulePromise = import("mermaid").then((module) => {
      module.default.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: "dark",
      });
      return module;
    });
  }
  return mermaidModulePromise;
}

function MermaidBlock({ chart }: MermaidBlockProps) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const renderId = `mermaid-${Math.random().toString(36).slice(2)}`;
    loadMermaid()
      .then((module) => module.default.render(renderId, chart))
      .then((result) => {
        if (!mounted) return;
        setSvg(result.svg);
        setError("");
      })
      .catch((err: unknown) => {
        console.error("Mermaid render error:", err);
        if (!mounted) return;
        setError("Mermaid 图表渲染失败");
      });

    return () => {
      mounted = false;
    };
  }, [chart]);

  if (error) {
    return <pre className="rounded-xl border border-rose-200/30 bg-slate-950/70 p-3 text-xs text-rose-200">{error}</pre>;
  }

  if (!svg) {
    return <div className="rounded-xl border border-slate-200/20 bg-slate-900/70 p-3 text-xs text-slate-300">Mermaid 渲染中…</div>;
  }

  return <div className="mermaid-wrapper overflow-x-auto rounded-xl border border-slate-200/20 bg-white/95 p-3" dangerouslySetInnerHTML={{ __html: svg }} />;
}

export default function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const markdown = useMemo(() => content || "", [content]);
  const allowDataImage = (url: string) => /^data:image\/[a-zA-Z0-9.+-]+;base64,[a-zA-Z0-9+/=\s]+$/.test(url);

  return (
    <article className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        urlTransform={(url, key) => {
          if (key === "src" && allowDataImage(url)) return url;
          return defaultUrlTransform(url);
        }}
        components={{
          code({ className: codeClassName, children, ...props }) {
            const text = String(children ?? "");
            const language = codeClassName?.replace("language-", "").trim();
            const isInline = !codeClassName && !text.includes("\n");

            if (isInline) {
              return (
                <code className="rounded bg-slate-900/80 px-1.5 py-0.5 text-[0.92em] text-rose-100" {...props}>
                  {children}
                </code>
              );
            }

            if (language === "mermaid") {
              return <MermaidBlock chart={text} />;
            }

            return (
              <pre className="overflow-x-auto rounded-xl border border-slate-200/15 bg-slate-950/80 p-3 text-sm text-slate-100">
                <code className={codeClassName} {...props}>
                  {children}
                </code>
              </pre>
            );
          },
          a({ children, ...props }) {
            return (
              <a {...props} className="text-cyan-200 underline underline-offset-4" target="_blank" rel="noreferrer">
                {children}
              </a>
            );
          },
          img({ ...props }) {
            return <img {...props} className="my-4 rounded-xl border border-slate-200/20" loading="lazy" decoding="async" />;
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  );
}
