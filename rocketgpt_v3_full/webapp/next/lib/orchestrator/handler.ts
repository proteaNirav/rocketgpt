import type {
  ChatRequestBody,
  ChatResponse,
  WorkflowStep,
} from "./types";
import { getModelProfile } from "./modelRegistry";
import { callEngine } from "../engines";

type EngineCallResult = {
  engineText: string | null;
  providerInfo: string;
};

async function runEngineForProfile(
  profileId: string,
  message: string
): Promise<EngineCallResult> {
  const profile = getModelProfile(profileId);
  if (!profile || profile.provider === "orchestrator") {
    return { engineText: null, providerInfo: "" };
  }

  try {
    const engineRes = await callEngine(profile.provider, {
      model: profile.providerModel,
      prompt: message,
    });

    const providerInfo = ` [provider=${engineRes.provider}, model=${engineRes.model}]`;
    return { engineText: engineRes.text, providerInfo };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Engine call failed for profile", profileId, error);
    return { engineText: null, providerInfo: "" };
  }
}

export async function handleChat(body: ChatRequestBody): Promise<ChatResponse> {
  const rawMessage = body.message;
  const message = rawMessage.trim();

  const modeProfileId =
    typeof body.modeProfileId === "string" && body.modeProfileId.length > 0
      ? body.modeProfileId
      : "auto-smart-router";

  const timestamp = new Date().toISOString();

  // Workflow demo
  if (modeProfileId.startsWith("workflow-")) {
    const workflowPlan: WorkflowStep[] = [
      {
        stage: "Plan",
        purpose: "Understand the user request and define a multi-step approach",
        model: "llm-gpt-5.1",
      },
      {
        stage: "Design",
        purpose: "Design UI/UX, data flows or architecture as needed",
        model: "uiux-claude-3.5-sonnet",
      },
      {
        stage: "Implement",
        purpose: "Generate or refine code / SQL / scripts",
        model: "dev-gpt-5.1",
      },
      {
        stage: "Validate",
        purpose: "Review and test the generated outputs",
        model: "maths-gpt-4.1",
      },
    ];

    const reply = `Workflow Orchestrator demo activated for: "${message}". RocketGPT would now execute a chained flow across multiple models.`;

    const response: ChatResponse = {
      kind: "workflow",
      reply,
      modeProfileId,
      workflowPlan,
      timestamp,
    };

    return response;
  }

  // Auto router demo
  if (modeProfileId === "auto-smart-router") {
    const lower = message.toLowerCase();

    let chosenModel = "llm-gpt-5.1";
    let reason = "General reasoning / LLM mode";

    if (
      lower.includes("sql") ||
      lower.includes("database") ||
      lower.includes("index") ||
      lower.includes("query") ||
      lower.includes("join")
    ) {
      chosenModel = "db-gpt-4.1";
      reason = "Detected DB / SQL / schema-related question";
    } else if (
      lower.includes("ui") ||
      lower.includes("ux") ||
      lower.includes("figma") ||
      lower.includes("screen") ||
      lower.includes("layout")
    ) {
      chosenModel = "uiux-claude-3.5-sonnet";
      reason = "Detected UI/UX / design-related question";
    } else if (
      lower.includes("finance") ||
      lower.includes("market") ||
      lower.includes("stock") ||
      lower.includes("budget") ||
      lower.includes("roi")
    ) {
      chosenModel = "finance-gpt-4.1";
      reason = "Detected finance / market / ROI-related question";
    } else if (
      lower.includes("bigdata") ||
      lower.includes("data lake") ||
      lower.includes("kafka") ||
      lower.includes("etl")
    ) {
      chosenModel = "bigdata-gemini-1.5-pro";
      reason = "Detected big data / pipeline-related question";
    }

    const { engineText, providerInfo } = await runEngineForProfile(
      chosenModel,
      message
    );

    const reply = engineText
      ? `Auto Router selected **${chosenModel}**${providerInfo} for your message: "${message}".\n\nEngine reply:\n${engineText}`
      : `Auto Router selected **${chosenModel}**${providerInfo} for your message: "${message}". In a real system, RocketGPT would now call this engine via the orchestrator.`;

    const response: ChatResponse = {
      kind: "auto",
      reply,
      modeProfileId,
      chosenModel,
      reason,
      timestamp,
    };

    return response;
  }

  // Direct single-model call
  const { engineText, providerInfo } = await runEngineForProfile(
    modeProfileId,
    message
  );

  const reply = engineText
    ? `Direct mode active (${modeProfileId})${providerInfo}.\n\nEngine reply:\n${engineText}`
    : `Direct mode active (${modeProfileId})${providerInfo}. In the real system, RocketGPT would now call this specific model to answer: "${message}".`;

  const response: ChatResponse = {
    kind: "direct",
    reply,
    modeProfileId,
    targetModel: modeProfileId,
    timestamp,
  };

  return response;
}
