"use client";

import { useState } from "react";
import { UserCog, X } from "lucide-react";
import api from "@/services/api";

/**
 * Impersonation sırasında görünen sticky banner.
 * JWT'de impersonatedBy claim'i varsa gösterilir.
 */
export default function ImpersonationBanner({
  impersonating,
  onEnd,
}: {
  impersonating: { name: string; role: string } | null;
  onEnd: () => void;
}) {
  const [ending, setEnding] = useState(false);

  if (!impersonating) return null;

  const handleEnd = async () => {
    setEnding(true);
    try {
      await api.post("/admin/impersonate/end");
      onEnd();
    } catch {
      setEnding(false);
    }
  };

  return (
    <div className="sticky top-0 z-[60] flex items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-md">
      <UserCog className="h-4 w-4 flex-shrink-0" />
      <span>
        <strong>{impersonating.name}</strong> olarak görüntülüyorsunuz (
        {impersonating.role})
      </span>
      <button
        type="button"
        onClick={handleEnd}
        disabled={ending}
        className="ml-2 inline-flex items-center gap-1 rounded-md bg-white/20 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/30 disabled:opacity-50"
      >
        <X className="h-3 w-3" />
        {ending ? "Çıkılıyor..." : "Oturumu Bitir"}
      </button>
    </div>
  );
}
