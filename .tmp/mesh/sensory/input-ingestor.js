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
        const trustClass = this.trustClassifier.classify(request.source, request.metadata);
        const risk = this.riskScorer.scoreFor(trustClass);
        const now = new Date().toISOString();
        return {
            eventId: `evt_${Date.now()}`,
            sessionId: request.sessionId,
            occurredAt: now,
            source: request.source,
            processingMode: request.processingMode ?? "sync",
            trustClass,
            risk,
            rawInput: request.rawInput,
            normalizedInput: this.normalizer.normalize(request.rawInput),
            metadata: request.metadata,
            tags: [],
        };
    }
}
exports.InputIngestor = InputIngestor;
