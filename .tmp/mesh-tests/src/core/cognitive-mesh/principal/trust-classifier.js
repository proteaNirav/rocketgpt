"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrustClassifier = void 0;
/**
 * TrustClassifier is intentionally heuristic-free for V1 foundation.
 * It only maps explicit metadata hints and defaults to restricted.
 */
class TrustClassifier {
    classify(source, metadata) {
        const hinted = metadata?.trustClass;
        if (hinted === "trusted" ||
            hinted === "restricted" ||
            hinted === "untrusted" ||
            hinted === "quarantined" ||
            hinted === "evidence_only" ||
            hinted === "blocked") {
            return hinted;
        }
        if (source.startsWith("internal:")) {
            return "trusted";
        }
        return "restricted";
    }
}
exports.TrustClassifier = TrustClassifier;
