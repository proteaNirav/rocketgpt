"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InputIngestor = void 0;
const risk_scorer_1 = require("../principal/risk-scorer");
const trust_classifier_1 = require("../principal/trust-classifier");
const signal_normalizer_1 = require("./signal-normalizer");
/**
 * InputIngestor maps arbitrary incoming signals onto a standard CognitiveEvent.
 * This is designed to stay fast on the sync path and avoid external calls.
 */
class InputIngestor {
    constructor(normalizer = new signal_normalizer_1.SignalNormalizer(), trustClassifier = new trust_classifier_1.TrustClassifier(), riskScorer = new risk_scorer_1.RiskScorer()) {
        this.normalizer = normalizer;
        this.trustClassifier = trustClassifier;
        this.riskScorer = riskScorer;
    }
    ingest(request) {
        const sourceType = this.resolveSourceType(request);
        const trustClass = this.trustClassifier.classify(request.source, request.metadata);
        const normalizedInput = this.normalizer.normalize(request.rawInput, sourceType);
        const risk = this.riskScorer.scoreFor(trustClass, normalizedInput);
        const now = new Date().toISOString();
        return {
            eventId: `evt_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
            sessionId: request.sessionId,
            requestId: request.requestId,
            occurredAt: now,
            source: request.source,
            sourceType,
            routeType: request.routeType,
            processingMode: request.processingMode ?? "sync",
            trustClass,
            risk,
            rawInput: request.rawInput,
            normalizedInput,
            metadata: request.metadata,
            tags: [],
        };
    }
    resolveSourceType(request) {
        const hinted = request.metadata?.sourceType;
        if (hinted === "chat.user_text" ||
            hinted === "workflow.trigger" ||
            hinted === "cats.task_execution") {
            return hinted;
        }
        const source = request.source.toLowerCase();
        if (source.includes("chat") || source.includes("user_text")) {
            return "chat.user_text";
        }
        if (source.includes("workflow") || source.includes("orchestrator")) {
            return "workflow.trigger";
        }
        if (source.includes("cats") || source.includes("task")) {
            return "cats.task_execution";
        }
        return "unknown";
    }
}
exports.InputIngestor = InputIngestor;
