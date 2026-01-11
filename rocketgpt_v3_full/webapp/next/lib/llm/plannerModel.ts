export async function callPlannerModel(input: any): Promise<any> {
  // Demo-only planner stub for RocketGPT Orchestrator.
  // Generates a small predictable plan so UI features can be demonstrated
  // without a real LLM backend.

  const goalTitle: string = input?.goal_title ?? 'Untitled Goal'
  const goalDescription: string = input?.goal_description ?? 'No description'

  const runId = 'stub-plan-' + Math.random().toString(36).slice(2, 10)

  const steps = [
    {
      step_no: 1,
      title: 'Analyse Goal & Existing Code',
      description: `Understand the goal "${goalTitle}" and review current code / config.`,
      acceptance_criteria: 'Clear understanding of scope, constraints, and affected modules.',
    },
    {
      step_no: 2,
      title: 'Propose Changes & File Targets',
      description: 'List files to touch, outline modifications, and define test impact.',
      acceptance_criteria: 'Draft plan of code changes and test strategy is documented.',
    },
    {
      step_no: 3,
      title: 'Implement Changes & Prepare Tests',
      description: 'Apply changes, update configs, and prepare or update automated tests.',
      acceptance_criteria: 'Code compiles, tests are ready to be executed, no lint errors.',
    },
  ]

  return {
    success: true,
    run_id: runId,
    plan_title: goalTitle,
    goal_summary: goalDescription,
    steps,
    raw: {
      success: true,
      run_id: runId,
      steps,
      raw: null,
    },
  }
}
