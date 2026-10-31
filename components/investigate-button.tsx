"use client";

import { useFormStatus } from "react-dom";
import { investigateAction } from "@/app/actions";

type Variant = "primary" | "secondary";

const STYLES: Record<Variant, string> = {
  primary: "min-h-11 px-4 bg-accent text-white hover:bg-accent-ink",
  secondary: "min-h-10 px-3.5 border border-gray-300 bg-white text-ink hover:bg-subtle",
};

function Submit({ label, variant }: { label: string; variant: Variant }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`rounded-lg font-semibold disabled:opacity-60 ${STYLES[variant]}`}>
      {pending ? "Starting…" : label}
    </button>
  );
}

export function InvestigateButton({
  disputeId,
  label = "Run investigation",
  variant = "primary",
}: {
  disputeId: string;
  label?: string;
  variant?: Variant;
}) {
  return (
    <form action={investigateAction.bind(null, disputeId)}>
      <Submit label={label} variant={variant} />
    </form>
  );
}
