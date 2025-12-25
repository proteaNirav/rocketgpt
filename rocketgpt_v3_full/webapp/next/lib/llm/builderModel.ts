export async function callBuilderModel(input: any): Promise<any> {
  // TODO: Replace with real Builder model call
  console.log("[Stub] callBuilderModel invoked", input);
  return {
    success: true,
    files_changed: [],
    run_id: input?.run_id ?? "stub-run-id",
    raw: null,
  };
}
