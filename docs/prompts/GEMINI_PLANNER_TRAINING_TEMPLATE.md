Gemini Design-Time Training Template for RocketGPT – Planner Prompt

Purpose



This template defines how Gemini is allowed to help improve the Planner Prompt for RocketGPT, without ever affecting runtime logic or the OpenAI-only execution model.



Gemini is used only as a design-time assistant:



Suggest better wording for the Planner instructions



Propose clearer planning rules and constraints



Generate example plans for different domains



Improve descriptions of the JSON schema fields



Refine assumptions, risks and notes text



Gemini must NOT:



Suggest code changes



Suggest CI/CD, infra or deployment changes



Suggest provider routing changes or adding Gemini as a runtime LLM



Suggest security, RLS or database policy changes



Suggest changing RocketGPT to run on Gemini at runtime



What Gemini receives



When you use this template, you will give Gemini:



The current Planner Prompt Specification (PLANNER\_PROMPT\_SPEC.md)



Optionally, some example user goals you care about



Optionally, some previous plans that were unclear, too long, or low quality



What Gemini must produce



Gemini must only produce design-time suggestions in normal text, such as:



Suggested wording improvements



Clearer sentences for the Planner’s system instructions



Better phrasing of rules, constraints and responsibilities



Suggested structural improvements



Better ordering or grouping of rules



Suggestions to highlight the most important constraints



Suggestions to simplify or shorten repetitive parts



Example plans (minimum 3)



Example of a good plan for a SQL optimization task



Example of a good plan for a Next.js / TypeScript feature



Example of a good plan for an AI/Test automation or crawl + test flow



Each example should show multiple steps with ids, titles, descriptions, dependencies and risk levels



Optional: additional step types or metadata



Suggestions for new step types if needed (for example: monitoring, rollback, data-migration)



Suggestions for extra metadata fields only if they clearly add value



Notes / cautions



Any ambiguity that should be clarified by humans or by the OpenAI Planner



Any cases where the rules might conflict or be hard for a model to follow



Required output structure



Gemini should follow this output structure in sections:



Suggested Wording Improvements

(Write improved system instructions only, as plain text.)



Suggested Structural Improvements

(Explain ordering, grouping and rule changes.)



Example Plans

(Provide at least 3 example plans for different domains, each with multiple steps.)



Optional: Additional Step Types or Metadata

(Only if clearly useful.)



Notes / Cautions

(Anything risky, unclear or that should stay under human/OpenAI control.)



Policy reminder for Gemini



Gemini is an external design-time assistant only.



Gemini does not run inside RocketGPT.



Gemini does not decide which model RocketGPT uses at runtime.



Gemini does not edit code, workflows, security or infra.



All Gemini suggestions will:



Be reviewed by a human



Optionally be refined using OpenAI-based assistants



Only then, be integrated into the Planner specification or related prompts via Git



The runtime behavior of RocketGPT, including the Planner agent, remains strictly on OpenAI (and optionally Claude in future if explicitly added).

