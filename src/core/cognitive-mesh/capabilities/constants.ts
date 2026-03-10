export const CAPABILITY_IDS = {
  LANGUAGE: "cap.language.v1",
  RETRIEVAL: "cap.retrieval.v1",
  VERIFICATION: "cap.verification.v1",
} as const;

export const CAPABILITY_OPERATIONS = {
  LANGUAGE_NORMALIZE: "language.normalize",
  LANGUAGE_SUMMARIZE: "language.summarize",
  LANGUAGE_STRUCTURE: "language.structure",
  RETRIEVAL_LOOKUP: "retrieval.lookup",
  VERIFICATION_VALIDATE: "verification.validate",
} as const;

