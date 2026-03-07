"use client";

import { useState, type SetStateAction } from "react";

export function useDraftState<T>(source: T) {
  const [draft, setDraftValue] = useState<T | null>(null);

  const setDraft = (next: SetStateAction<T>) => {
    setDraftValue((previous) => {
      const current = previous ?? source;
      return typeof next === "function"
        ? (next as (value: T) => T)(current)
        : next;
    });
  };

  return {
    value: draft ?? source,
    hasDraft: draft !== null,
    reset: () => setDraftValue(null),
    setDraft,
  };
}
