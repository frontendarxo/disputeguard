"use client";

import { useState, useTransition } from "react";
import { previewRuleAction, saveRuleAction } from "@/app/actions";
import type { ParsedRule } from "@/lib/policy/types";
import { ACTION_CLASSES, ACTION_LABELS, conditionChips } from "@/lib/ui/rules";

export function RuleComposer() {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ParsedRule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const onPreview = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await previewRuleAction(text);
      if (result.ok) setPreview(result.rule);
      else {
        setPreview(null);
        setError(result.message);
      }
    });
  };

  const onSave = () => {
    if (!preview) return;
    startTransition(async () => {
      const result = await saveRuleAction(text, preview);
      if (result.ok) {
        setText("");
        setPreview(null);
        setSaved(true);
      } else setError(result.message);
    });
  };

  return (
    <section aria-labelledby="new-title" className="flex flex-col gap-3.5 rounded-xl border border-line bg-white p-6">
      <form onSubmit={onPreview} className="flex flex-col gap-3.5">
        <label id="new-title" htmlFor="new-rule" className="text-base font-semibold">
          Add a rule
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="new-rule"
            type="text"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setPreview(null);
            }}
            placeholder="e.g. Refund automatically if the parcel was lost and it's under $20"
            className="min-h-11 min-w-0 flex-[1_1_360px] rounded-lg border border-gray-300 px-3.5 text-ink"
          />
          <button
            type="submit"
            disabled={pending || text.trim().length < 8}
            className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 font-semibold text-ink hover:bg-subtle disabled:opacity-60"
          >
            {pending && !preview ? "Understanding…" : "Preview"}
          </button>
        </div>
      </form>

      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="font-medium text-ok">
          Rule saved and active.
        </p>
      )}

      {preview && (
        <div className="flex flex-col gap-3 rounded-[10px] border border-dashed border-slate-300 bg-subtle px-4 py-3.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">How the agent understood it</span>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted">If</span>
            {conditionChips(preview).map((chip) => (
              <span key={chip} className="rounded-md border border-line bg-white px-2.5 py-1 font-medium">
                {chip}
              </span>
            ))}
            <span className="text-muted">then</span>
            <span className={`rounded-md px-2.5 py-1 font-semibold ${ACTION_CLASSES[preview.action]}`}>{ACTION_LABELS[preview.action]}</span>
          </div>
          <p className="text-body">{preview.explanation}</p>
          {preview.unsupported && <p className="text-warn">Not covered: {preview.unsupported}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onSave}
              disabled={pending}
              className="min-h-11 rounded-lg bg-accent px-4 font-semibold text-white hover:bg-accent-ink disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save rule"}
            </button>
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="min-h-11 rounded-lg px-3 font-semibold text-muted hover:text-ink"
            >
              Edit wording
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
