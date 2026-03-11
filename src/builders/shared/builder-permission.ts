export type BuilderPermission =
  | "read_architecture_docs"
  | "generate_code"
  | "modify_existing_code"
  | "create_tests"
  | "refactor_code"
  | "create_migrations"
  | "update_registry"
  | "update_knowledge"
  | "invoke_other_builders"
  | "access_network"
  | "modify_core_runtime"
  | "publish_artifacts"
  | "request_promotion_review";
