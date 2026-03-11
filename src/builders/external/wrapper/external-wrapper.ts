export interface ExternalWrapperContext {
  builderId: string;
  request: unknown;
}

export async function runExternalBuilderWithWrapper(
  _context: ExternalWrapperContext,
): Promise<void> {
  // TODO: Attach registration lookup, policy shaping, output validation, and reporting.
}
