import { NextResponse } from "next/server";

type BuilderStep = {
  id?: string;
  title?: string;
  description?: string;
  index?: number;
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  if (!body || typeof body.goal !== "string") {
    return NextResponse.json(
      { error: "Missing required field: goal" },
      { status: 400 }
    );
  }

  if (!body.step) {
    return NextResponse.json(
      { error: "Missing required field: step" },
      { status: 400 }
    );
  }

  const step: BuilderStep = body.step;
  const index = typeof step.index === "number" ? step.index : 0;

  const model = "gpt-4o-mini"; // placeholder, later we can route to real LLM

  const result = {
    summary: `Builder run for step ${index + 1}: ${step.title ?? "Untitled step"}`,
    details: [
      `Goal: ${body.goal}`,
      "",
      `Step ${index + 1} title: ${step.title ?? "Untitled"}`,
      `Step description: ${step.description ?? "No description provided."}`,
      "",
      "This is a placeholder Builder response. In a future iteration, this endpoint",
      "will generate real code patches, configuration changes, or detailed instructions",
      "for this step using the selected LLM and repository context.",
    ].join("\n"),
  };

  return NextResponse.json({
    model,
    result,
  });
}
