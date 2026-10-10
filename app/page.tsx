"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/scan");
  }, [router]);

  return (
    <div className="flex h-[70vh] flex-col items-center justify-center p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400 text-black font-bold shadow-lg shadow-amber-400/20 mb-3">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
      <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
        Opening Member Portal...
      </p>
    </div>
  );
}
