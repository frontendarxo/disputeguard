"use client";

import { useState, useTransition } from "react";
import { importDisputeAction } from "@/app/actions";

export function ImportDispute() {
  const [id, setId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await importDisputeAction(id);
          if (result && !result.ok) setError(result.message);
        });
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="import-id" className="sr-only">
          PayPal dispute ID
        </label>
        <input
          id="import-id"
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="PP-R-ABC-12345678"
          className="min-h-10 w-56 rounded-lg border border-gray-300 px-3 font-mono text-[13px] text-ink"
        />
        <button
          type="submit"
          disabled={pending || id.trim().length < 8}
          className="min-h-10 rounded-lg border border-gray-300 bg-white px-3.5 font-semibold text-ink hover:bg-subtle disabled:opacity-60"
        >
          {pending ? "Importing…" : "Import by ID"}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
