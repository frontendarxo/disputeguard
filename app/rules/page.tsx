import { restoreStarterRulesAction } from "@/app/actions";
import { RuleComposer } from "@/components/rule-composer";
import { RuleDelete } from "@/components/rule-delete";
import { RuleToggle } from "@/components/rule-toggle";
import { loadRules } from "@/lib/policy/rules-store";
import { DEFAULT_GUARDRAILS } from "@/lib/policy/types";
import { ACTION_CLASSES, ACTION_LABELS, conditionChips } from "@/lib/ui/rules";

export const dynamic = "force-dynamic";

export default async function RulesPage() {
  const rules = await loadRules();
  const g = DEFAULT_GUARDRAILS;

  return (
    <main className="mx-auto flex max-w-[960px] flex-col gap-6 px-4 py-8 sm:px-8">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight">Agent rules</h1>
        <p className="mt-1.5 text-muted">
          Tell the agent, in your own words, when it may act on its own. Everything else comes to you for approval.
        </p>
      </div>

      <RuleComposer />

      <section aria-labelledby="active-title" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="active-title" className="text-base font-semibold">
            Your rules
          </h2>
          <form action={restoreStarterRulesAction}>
            <button type="submit" className="min-h-9 rounded-lg px-2 text-[13px] font-semibold text-accent-ink hover:bg-accent-soft">
              Restore starter rules
            </button>
          </form>
        </div>
        {rules.length === 0 && <p className="text-muted">No rules yet — every dispute will come to you.</p>}
        {rules.map((rule) => (
          <article
            key={rule.id}
            className={`flex flex-wrap items-start justify-between gap-4 rounded-xl border border-line bg-white p-5 ${rule.enabled ? "" : "opacity-60"}`}
          >
            <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-2.5">
              <span className="text-[15px] font-semibold">“{rule.text}”</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {conditionChips(rule).map((chip) => (
                  <span key={chip} className="rounded-md border border-line bg-subtle px-2 py-0.5 text-xs font-medium text-body">
                    {chip}
                  </span>
                ))}
                <span className="text-xs text-muted" aria-hidden="true">
                  →
                </span>
                <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${ACTION_CLASSES[rule.action]}`}>{ACTION_LABELS[rule.action]}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <RuleToggle ruleId={rule.id} enabled={rule.enabled} />
              <RuleDelete ruleId={rule.id} text={rule.text} />
            </div>
          </article>
        ))}
      </section>

      <section aria-label="Safety limits" className="flex items-start gap-3 rounded-xl border border-line bg-white p-5">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-px flex-shrink-0">
          <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />
        </svg>
        <div className="flex flex-col gap-1.5">
          <span className="font-semibold">Always needs your approval, whatever the rules say</span>
          <ul className="flex list-disc flex-col gap-1 pl-4 text-muted">
            <li>Disputes over {g.currency === "USD" ? "$" : ""}{g.maxAutoAmount}{g.currency === "USD" ? "" : ` ${g.currency}`}, or in a currency other than {g.currency}</li>
            <li>Fighting a dispute outside the {g.autoStages.fight.map((s) => s.toLowerCase()).join(" or ")} stage</li>
            <li>Refunding outside the {g.autoStages.refund.map((s) => s.toLowerCase()).join(" or ")} stages</li>
            <li>
              The agent being less than {Math.round(g.minConfidence.fight * 100)}% sure to fight, or {Math.round(g.minConfidence.refund * 100)}% sure to refund
            </li>
            <li>Fighting on a delivery that PayPal tracking doesn&apos;t confirm</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
