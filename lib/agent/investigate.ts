import { anthropic } from "@ai-sdk/anthropic";
import { generateText, stepCountIs, type StopCondition } from "ai";
import { buildSystemPrompt } from "./prompt";
import { normalizeAssessmentInput } from "./normalize";
import { assessmentSchema, type Assessment } from "./schema";
import { investigationTools } from "./tools";

export interface AgentStepEvent {
  index: number;
  text: string;
  toolCalls: Array<{ tool: string; input: unknown }>;
  toolResults: Array<{ tool: string; output: unknown }>;
}

export interface InvestigationResult {
  disputeId: string;
  assessment: Assessment;
  steps: AgentStepEvent[];
  model: string;
}

export const DEFAULT_MODEL = "claude-sonnet-5-5";

export { normalizeAssessmentInput };

function validSubmission(input: unknown) {
  return assessmentSchema.safeParse(normalizeAssessmentInput(input));
}

/** Stop only once the agent has submitted a *valid* assessment; otherwise it sees the error and can fix it. */
const submittedValidAssessment: StopCondition<typeof investigationTools> = ({ steps }) =>
  steps.some((s) => s.toolCalls.some((c) => c.toolName === "submit_assessment" && validSubmission(c.input).success));

export async function investigateDispute(
  disputeId: string,
  options: { onStep?: (step: AgentStepEvent) => void } = {},
): Promise<InvestigationResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set (see .env.example).");
  }
  const modelId = process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
  const steps: AgentStepEvent[] = [];

  const result = await generateText({
    model: anthropic(modelId),
    system: buildSystemPrompt(),
    prompt: `Investigate PayPal dispute ${disputeId} and submit your assessment.`,
    tools: investigationTools,
    stopWhen: [submittedValidAssessment, stepCountIs(12)],
    onStepFinish: (step) => {
      const event: AgentStepEvent = {
        index: steps.length,
        text: step.text,
        toolCalls: step.toolCalls.map((c) => ({ tool: c.toolName, input: c.input })),
        toolResults: step.toolResults.map((r) => ({ tool: r.toolName, output: r.output })),
      };
      steps.push(event);
      options.onStep?.(event);
    },
  });

  const submissions = result.steps.flatMap((s) => s.toolCalls).filter((c) => c.toolName === "submit_assessment");
  if (submissions.length === 0) {
    throw new Error("The agent finished without submitting an assessment.");
  }

  // Use the last valid submission (the agent may have corrected an earlier one).
  const parsed = submissions.map((c) => validSubmission(c.input)).reverse();
  const valid = parsed.find((p) => p.success);
  if (!valid?.success) {
    const issues = parsed[0].error?.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`The agent's assessment had an invalid format (${issues}).`);
  }
  const assessment = valid.data;
  return { disputeId, assessment, steps, model: modelId };
}
