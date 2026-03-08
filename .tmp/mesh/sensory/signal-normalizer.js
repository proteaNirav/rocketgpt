"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignalNormalizer = void 0;
/**
 * SignalNormalizer keeps request-path input shaping deterministic and cheap.
 * Advanced cleaning/semantic extraction is intentionally deferred.
 */
class SignalNormalizer {
    normalize(input) {
        if (typeof input === "string") {
            return input.trim();
        }
        if (input === null || input === undefined) {
            return "";
        }
        try {
            return JSON.stringify(input);
        }
        catch {
            return String(input);
        }
    }
}
exports.SignalNormalizer = SignalNormalizer;
