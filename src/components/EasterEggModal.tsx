import React from "react";

interface EasterEggModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EasterEggModal({ isOpen, onClose }: EasterEggModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border-2 border-pink-500 bg-zinc-900 shadow-[0_0_50px_rgba(236,72,153,0.6)]">
        <div className="absolute left-0 top-0 h-3 w-full bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600" />

        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 text-pink-300 transition-colors hover:bg-pink-500/20"
        >
          ✕
        </button>

        <div className="p-8 pt-12 text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 animate-pulse items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-pink-500 shadow-[0_0_30px_rgba(236,72,153,0.8)]">
            <span className="text-4xl text-white">❤</span>
          </div>

          <h2 className="mb-4 bg-gradient-to-r from-pink-400 to-purple-300 bg-clip-text font-serif text-2xl font-bold text-transparent">
            惊喜彩蛋
          </h2>

          <p className="text-lg font-medium leading-relaxed text-pink-100">
            我喜欢你，比昨天多一点，比明天少一点。
          </p>

          <div className="mt-8 flex justify-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-pink-500" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-purple-500 [animation-delay:0.2s]" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-pink-500 [animation-delay:0.4s]" />
          </div>
        </div>
      </div>
    </div>
  );
}
