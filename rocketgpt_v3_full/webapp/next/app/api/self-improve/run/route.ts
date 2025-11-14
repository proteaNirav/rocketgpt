import { NextResponse } from "next/server";

export async function POST() {
  try {
    const workflowDispatchUrl =
      "https://api.github.com/repos/proteaNirav/rocketgpt/actions/workflows/self_improve.yml/dispatches";

    const body = {
      ref: "main",
      inputs: {
        reason: "Triggered from RocketGPT UI",
      },
    };

    const response = await fetch(workflowDispatchUrl, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { success: false, error: errText },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
