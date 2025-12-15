import crypto from "crypto";
import { ensureRunDirs } from "@/lib/core-ai/run-folders";
import { writeDecisionEntry, writeDecisionOutcome } from "@/lib/core-ai/decision-ledger/writer";
