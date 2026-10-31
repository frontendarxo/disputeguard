import { anthropic } from "@ai-sdk/anthropic";
import { generateText, hasToolCall, stepCountIs } from "ai";
import { buildSystemPrompt } from "./prompt";
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
    stopWhen: [hasToolCall("submit_assessment"), stepCountIs(12)],
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

  const submission = result.steps
    .flatMap((s) => s.toolCalls)
    .find((c) => c.toolName === "submit_assessment");

  if (!submission) {
    throw new Error("The agent finished without submitting an assessment.");
  }

  const assessment = assessmentSchema.parse(submission.input);
  return { disputeId, assessment, steps, model: modelId };
}
