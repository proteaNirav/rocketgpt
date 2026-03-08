"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrincipalIntakeGuard = void 0;
const risk_scorer_1 = require("./risk-scorer");
/**
 * Intake guard is the first principal gate.
 * It keeps unsafe signals out of downstream memory/indexing layers.
 */
class PrincipalIntakeGuard {
    constructor(riskScorer = new risk_scorer_1.RiskScorer(), quarantineManager) {
        this.riskScorer = riskScorer;
        this.quarantineManager = quarantineManager;
    }
    async evaluate(event) {
        const trustClass = this.resolveTrust(event.trustClass, event.normalizedInput);
        const risk = this.riskScorer.scoreFor(trustClass);
        const reasons = [...risk.reasons];
        if (trustClass === "blocked") {
            reasons.push("blocked_by_principal_intake_guard");
            if (this.quarantineManager) {
                await this.quarantineManager.quarantine(event, reasons);
            }
            return { allowed: false, trustClass, risk, reasons };
        }
        if (trustClass === "quarantined") {
            reasons.push("quarantined_for_async_review");
            if (this.quarantineManager) {
                await this.quarantineManager.quarantine(event, reasons);
            }
            return { allowed: false, trustClass, risk, reasons };
        }
        return {
            allowed: true,
            trustClass,
            risk,
            reasons,
        };
    }
    resolveTrust(current, normalizedInput) {
        if (!normalizedInput) {
            return "evidence_only";
        }
        if (normalizedInput.length > 25000) {
            return "quarantined";
        }
        if (current === "blocked" || current === "quarantined") {
            return current;
        }
        return current;
    }
}
exports.PrincipalIntakeGuard = PrincipalIntakeGuard;
