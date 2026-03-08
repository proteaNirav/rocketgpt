"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CognitiveSignalPriority = void 0;
exports.getSignalPriorityWeight = getSignalPriorityWeight;
var CognitiveSignalPriority;
(function (CognitiveSignalPriority) {
    CognitiveSignalPriority["CRITICAL"] = "CRITICAL";
    CognitiveSignalPriority["HIGH"] = "HIGH";
    CognitiveSignalPriority["NORMAL"] = "NORMAL";
    CognitiveSignalPriority["LOW"] = "LOW";
    CognitiveSignalPriority["BACKGROUND"] = "BACKGROUND";
})(CognitiveSignalPriority || (exports.CognitiveSignalPriority = CognitiveSignalPriority = {}));
const PRIORITY_WEIGHT = {
    [CognitiveSignalPriority.CRITICAL]: 100,
    [CognitiveSignalPriority.HIGH]: 80,
    [CognitiveSignalPriority.NORMAL]: 60,
    [CognitiveSignalPriority.LOW]: 40,
    [CognitiveSignalPriority.BACKGROUND]: 20,
};
function getSignalPriorityWeight(priority) {
    return PRIORITY_WEIGHT[priority];
}
