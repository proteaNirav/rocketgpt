export type ConstitutionPermission =
  | "read_constitution"
  | "draft_constitution_change"
  | "validate_constitution_change"
  | "review_constitution_change"
  | "approve_constitution_change"
  | "activate_constitution_change"
  | "freeze_constitution_changes"
  | "restore_trusted_snapshot"
  | "view_audit_lineage"
  | "manage_os_policy_envelope";
