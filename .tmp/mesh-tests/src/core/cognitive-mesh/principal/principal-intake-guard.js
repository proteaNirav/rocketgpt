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
        const disposition = this.resolveDisposition(trustClass, event.normalizedInput);
        const risk = this.riskScorer.scoreFor(trustClass, event.normalizedInput);
        const reasons = [...risk.reasons];
        if (disposition === "block" || disposition === "quarantine") {
            reasons.push(disposition === "block" ? "blocked_by_principal_intake_guard" : "quarantined_for_async_review");
            if (this.quarantineManager) {
                await this.quarantineManager.quarantine(event, reasons);
            }
            return { allowed: false, disposition, trustClass, risk, reasons };
        }
        if (disposition === "restrict") {
            reasons.push("restricted_by_principal_intake_guard");
            return { allowed: false, disposition, trustClass, risk, reasons };
        }
        return {
            allowed: true,
            disposition: "allow",
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
    resolveDisposition(trustClass, normalizedInput) {
        const content = normalizedInput.toLowerCase();
        const highRiskPatterns = ["drop table", "rm -rf", "<script", "powershell -enc"];
        const foundHighRisk = highRiskPatterns.some((pattern) => content.includes(pattern));
        if (trustClass === "blocked" || foundHighRisk) {
            return "block";
        }
        if (trustClass === "quarantined" || normalizedInput.length > 12000) {
            return "quarantine";
        }
        if (trustClass === "untrusted" || trustClass === "evidence_only") {
            return "restrict";
        }
        return "allow";
    }
}
exports.PrincipalIntakeGuard = PrincipalIntakeGuard;
