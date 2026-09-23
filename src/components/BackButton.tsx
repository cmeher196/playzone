"use client";

import { useRouter } from "next/navigation";

export function BackButton({
  fallbackHref,
  children,
}: {
  fallbackHref: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  function goBack() {
    if (window.history.length > 1 && document.referrer.startsWith(window.location.origin)) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  }

  return (
    <button
      type="button"
      onClick={goBack}
      className="text-sm text-white/50 transition hover:text-white/80"
    >
      {children}
    </button>
  );
}
