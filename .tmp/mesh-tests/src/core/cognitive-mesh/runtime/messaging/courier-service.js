"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CourierService = void 0;
const message_session_manager_1 = require("./message-session-manager");
const private_car_vehicle_1 = require("./vehicles/private-car-vehicle");
const rocket_vehicle_1 = require("./vehicles/rocket-vehicle");
const secure_private_car_vehicle_1 = require("./vehicles/secure-private-car-vehicle");
const runtime_guard_1 = require("../runtime-guard");
const dispatch_guard_1 = require("../dispatch-guard");
const execution_ledger_1 = require("../execution-ledger");
const sleep = async (ms) => new Promise((resolve) => {
    setTimeout(resolve, ms);
});
class CourierService {
    constructor(deps) {
        this.deps = deps;
        this.sessionManager = deps.sessionManager ?? new message_session_manager_1.MessageSessionManager();
        this.runtimeGuard = deps.runtimeGuard ?? new runtime_guard_1.RuntimeGuard();
        this.dispatchGuard = deps.dispatchGuard ?? new dispatch_guard_1.DispatchGuard();
        this.executionLedger = deps.executionLedger ?? (0, execution_ledger_1.getExecutionLedger)();
    }
    async submitParcel(parcel) {
        this.sessionManager.trackParcel(parcel);
        return this.dispatchParcel(parcel);
    }
    async dispatchParcel(parcel) {
        let forceDedicatedDispatch = false;
        let rerouteMode;
        let dispatchAuditRequired = false;
        try {
            const guardedDispatch = await (0, dispatch_guard_1.executeWithDispatchGuard)(this.dispatchGuard, {
                category: "courier_dispatch",
                source: parcel.sourceNodeId,
                sourceType: parcel.sourceNodeClass,
                target: parcel.targetNodeId,
                targetKind: this.resolveTargetKind(parcel.targetNodeClass),
                route: `${parcel.sourceNodeClass}->${parcel.targetNodeClass}`,
                mode: "public_route",
                targetTrustHint: parcel.targetNodeClass === "governance" ? "restricted" : "trusted",
                targetHealthHint: "healthy",
                sensitivityHints: [parcel.profile.sensitivity, parcel.intent],
                safeMode: this.isSafeModePayload(parcel.payload),
                policyFlags: {
                    explicitDeny: this.readPayloadBoolean(parcel.payload, "dispatchGuardDeny"),
                    forceDegraded: this.readPayloadBoolean(parcel.payload, "dispatchGuardForceDegraded"),
                    requireAudit: this.readPayloadBoolean(parcel.payload, "dispatchGuardRequireAudit"),
                    safeModeRedirect: true,
                    forceRerouteTo: this.readPayloadReroute(parcel.payload),
                },
                ids: {
                    correlationId: parcel.sessionId,
                    executionId: parcel.parcelId,
                    requestId: parcel.sessionId,
                },
                protectedDispatch: true,
            }, {
                execute: () => this.dispatchWithRuntimeGuard(parcel, { forceDedicatedDispatch, rerouteMode, dispatchAuditRequired }),
                onSafeModeRedirect: () => Promise.resolve(this.rejectByRuntimeGuard(parcel, "dispatch_guard_safe_mode_redirect")),
                onReroute: (decision) => {
                    forceDedicatedDispatch = true;
                    rerouteMode = decision.reroute?.mode ?? "secure_dispatch";
                    return this.dispatchWithRuntimeGuard(parcel, { forceDedicatedDispatch, rerouteMode, dispatchAuditRequired });
                },
                onDegradedAllow: () => {
                    forceDedicatedDispatch = true;
                    return Promise.resolve();
                },
                onRequireAudit: () => {
                    dispatchAuditRequired = true;
                    return Promise.resolve();
                },
            });
            this.executionLedger.append({
                category: "dispatch",
                eventType: "dispatch.guard.evaluated",
                action: "dispatch_parcel",
                source: parcel.sourceNodeId,
                target: parcel.targetNodeId,
                ids: {
                    requestId: parcel.sessionId,
                    executionId: parcel.parcelId,
                    correlationId: parcel.sessionId,
                    sessionId: parcel.sessionId,
                },
                mode: this.toLedgerMode(guardedDispatch.decision.outcome),
                status: "evaluated",
                guard: { dispatch: guardedDispatch.decision },
                metadata: { sourceClass: parcel.sourceNodeClass, targetClass: parcel.targetNodeClass },
            });
            return guardedDispatch.value;
        }
        catch (error) {
            if (error instanceof dispatch_guard_1.DispatchGuardDeniedError) {
                this.executionLedger.append({
                    category: "dispatch",
                    eventType: "dispatch.denied",
                    action: "dispatch_parcel",
                    source: parcel.sourceNodeId,
                    target: parcel.targetNodeId,
                    ids: {
                        requestId: parcel.sessionId,
                        executionId: parcel.parcelId,
                        correlationId: parcel.sessionId,
                        sessionId: parcel.sessionId,
                    },
                    mode: this.toLedgerMode(error.decision.outcome),
                    status: "denied",
                    guard: { dispatch: error.decision },
                });
                return this.rejectByRuntimeGuard(parcel, error.message);
            }
            throw error;
        }
    }
    async dispatchWithRuntimeGuard(parcel, options) {
        let forceDedicatedDispatch = options.forceDedicatedDispatch;
        const guarded = await (0, runtime_guard_1.executeWithRuntimeGuard)(this.runtimeGuard, {
            actionType: "cat_execution",
            actor: parcel.sourceNodeClass,
            source: parcel.sourceNodeId,
            target: parcel.targetNodeId,
            requestedOperation: "dispatch_parcel",
            sensitivityHints: [parcel.profile.sensitivity, parcel.intent],
            riskHint: parcel.priority === "critical" || parcel.priority === "emergency" ? "critical" : "medium",
            safeMode: this.isSafeModePayload(parcel.payload),
            policyFlags: {
                allowInSafeMode: false,
                allowDegradedInSafeMode: false,
                requireAudit: options.dispatchAuditRequired,
            },
            ids: {
                correlationId: parcel.sessionId,
                executionId: parcel.parcelId,
            },
            protectedAction: true,
        }, {
            execute: () => this.dispatchParcelCore(parcel, {
                forceDedicatedDispatch,
                rerouteMode: options.rerouteMode,
            }),
            onSafeModeRedirect: () => Promise.resolve(this.rejectByRuntimeGuard(parcel, "runtime_guard_safe_mode_redirect")),
            onDegradedAllow: () => {
                forceDedicatedDispatch = true;
                return Promise.resolve();
            },
            onRequireAudit: () => Promise.resolve(),
        });
        this.executionLedger.append({
            category: "runtime",
            eventType: "runtime.guard.evaluated",
            action: "dispatch_parcel",
            source: parcel.sourceNodeId,
            target: parcel.targetNodeId,
            ids: {
                requestId: parcel.sessionId,
                executionId: parcel.parcelId,
                correlationId: parcel.sessionId,
                sessionId: parcel.sessionId,
            },
            mode: this.toLedgerMode(guarded.decision.outcome),
            status: "evaluated",
            guard: { runtime: guarded.decision },
        });
        return guarded.value;
    }
    dispatchParcelCore(parcel, options) {
        this.executionLedger.append({
            category: "dispatch",
            eventType: "dispatch.started",
            action: "dispatch_parcel",
            source: parcel.sourceNodeId,
            target: parcel.targetNodeId,
            ids: {
                requestId: parcel.sessionId,
                executionId: parcel.parcelId,
                correlationId: parcel.sessionId,
                sessionId: parcel.sessionId,
            },
            mode: options.forceDedicatedDispatch || options.rerouteMode ? "degraded" : "normal",
            status: "started",
            sideEffect: { intent: true, completed: false, hints: ["courier_dispatch"] },
        });
        const selection = this.deps.vehicleSelector.select(parcel);
        const effectiveSelection = this.applyRerouteSelection(selection, options.rerouteMode);
        const policy = this.deps.policyEngine.validateParcel(parcel, effectiveSelection.tunnel, effectiveSelection.vehicleType);
        if (!policy.allowed) {
            this.executionLedger.append({
                category: "execution",
                eventType: "execution.denied",
                action: "dispatch_parcel",
                source: parcel.sourceNodeId,
                target: parcel.targetNodeId,
                ids: {
                    requestId: parcel.sessionId,
                    executionId: parcel.parcelId,
                    correlationId: parcel.sessionId,
                    sessionId: parcel.sessionId,
                },
                mode: options.forceDedicatedDispatch || options.rerouteMode ? "degraded" : "normal",
                status: "denied",
                metadata: { reason: policy.reason ?? "policy_rejected" },
            });
            return Promise.resolve(this.rejectByRuntimeGuard(parcel, policy.reason ?? "policy_rejected", effectiveSelection.vehicleType, effectiveSelection.tunnel));
        }
        if (!options.forceDedicatedDispatch &&
            !effectiveSelection.dedicatedDispatch &&
            this.deps.vehicleSelector.publicVehicleAccepts(parcel)) {
            const queued = this.queueParcel(parcel, this.resolveStopId(parcel.sourceNodeId));
            this.executionLedger.append({
                category: "dispatch",
                eventType: "dispatch.completed",
                action: "dispatch_parcel",
                source: parcel.sourceNodeId,
                target: parcel.targetNodeId,
                ids: {
                    requestId: parcel.sessionId,
                    executionId: parcel.parcelId,
                    correlationId: parcel.sessionId,
                    sessionId: parcel.sessionId,
                },
                mode: "normal",
                status: "completed",
                sideEffect: { intent: true, completed: true, hints: ["public_route_queue"] },
                metadata: { receiptStatus: queued.status, vehicle: queued.vehicle },
            });
            return Promise.resolve(queued);
        }
        switch (effectiveSelection.vehicleType) {
            case "secure-private-car":
                return this.dispatchSecureVehicle(parcel, effectiveSelection.tunnel);
            case "rocket":
                return this.dispatchEmergencyVehicle(parcel);
            default:
                return this.dispatchPrivateVehicle(parcel, effectiveSelection.tunnel);
        }
    }
    rejectByRuntimeGuard(parcel, reason, vehicleType = "public-bus", tunnel = "interactive") {
        const receipt = this.deps.receiptLedger.createReceipt(parcel, vehicleType, tunnel, "rejected", reason);
        this.deps.eventBus.emit("parcelRejected", { parcel, reason });
        this.deps.eventBus.emit("receiptCreated", { receipt });
        this.executionLedger.append({
            category: "execution",
            eventType: "execution.denied",
            action: "dispatch_parcel",
            source: parcel.sourceNodeId,
            target: parcel.targetNodeId,
            ids: {
                requestId: parcel.sessionId,
                executionId: parcel.parcelId,
                correlationId: parcel.sessionId,
                sessionId: parcel.sessionId,
            },
            mode: "safe_mode_redirect",
            status: "denied",
            metadata: { reason, vehicle: vehicleType, tunnel },
        });
        return receipt;
    }
    isSafeModePayload(payload) {
        if (!payload || typeof payload !== "object") {
            return false;
        }
        const value = payload;
        return value.safeMode === true || value.safe_mode === true || value.safeModeEnabled === true;
    }
    readPayloadBoolean(payload, key) {
        if (!payload || typeof payload !== "object") {
            return false;
        }
        return payload[key] === true;
    }
    readPayloadReroute(payload) {
        if (!payload || typeof payload !== "object") {
            return undefined;
        }
        const value = payload["dispatchGuardRerouteTo"];
        if (!value || typeof value !== "object") {
            return undefined;
        }
        const source = value;
        const target = typeof source.target === "string" && source.target.length > 0 ? source.target : undefined;
        const mode = this.isDispatchMode(source.mode) ? source.mode : undefined;
        if (!target && !mode) {
            return undefined;
        }
        return { target, mode };
    }
    isDispatchMode(value) {
        return (value === "sync" ||
            value === "async" ||
            value === "public_route" ||
            value === "private_dispatch" ||
            value === "secure_dispatch" ||
            value === "emergency_dispatch" ||
            value === "unknown");
    }
    resolveTargetKind(targetClass) {
        const internal = new Set(["cat", "learner", "librarian", "router", "planner", "memory", "research", "analyst", "governance", "execution"]);
        return internal.has(targetClass) ? "internal" : "external";
    }
    applyRerouteSelection(selection, rerouteMode) {
        if (!rerouteMode) {
            return selection;
        }
        if (rerouteMode === "emergency_dispatch") {
            return { tunnel: "emergency", vehicleType: "rocket", dedicatedDispatch: true };
        }
        if (rerouteMode === "secure_dispatch") {
            return { tunnel: selection.tunnel, vehicleType: "secure-private-car", dedicatedDispatch: true };
        }
        if (rerouteMode === "private_dispatch") {
            return { tunnel: selection.tunnel, vehicleType: "private-car", dedicatedDispatch: true };
        }
        if (rerouteMode === "public_route") {
            return { tunnel: "interactive", vehicleType: "public-bus", dedicatedDispatch: false };
        }
        return selection;
    }
    queueParcel(parcel, stopId) {
        this.deps.queueManager.enqueueParcel(stopId, parcel);
        const receipt = this.deps.receiptLedger.createReceipt(parcel, "public-bus", "interactive", "queued");
        this.deps.eventBus.emit("parcelQueued", { parcel, stopId });
        this.deps.eventBus.emit("receiptCreated", { receipt });
        return receipt;
    }
    async dispatchPrivateVehicle(parcel, tunnel) {
        const vehicle = (0, private_car_vehicle_1.createPrivateCarVehicle)(tunnel);
        return this.dispatchDedicatedVehicle(parcel, vehicle, 125);
    }
    async dispatchSecureVehicle(parcel, tunnel) {
        const vehicle = (0, secure_private_car_vehicle_1.createSecurePrivateCarVehicle)(tunnel);
        return this.dispatchDedicatedVehicle(parcel, vehicle, 175);
    }
    async dispatchEmergencyVehicle(parcel) {
        const vehicle = (0, rocket_vehicle_1.createRocketVehicle)();
        return this.dispatchDedicatedVehicle(parcel, vehicle, 75);
    }
    async markDeliveredByRoute(parcel, routeId) {
        this.deps.receiptLedger.updateStatus(parcel.parcelId, "delivered", {
            timestamp: new Date().toISOString(),
            location: routeId,
            note: "delivered_by_public_route",
        });
        const receipt = this.deps.receiptLedger.getByParcelId(parcel.parcelId);
        if (receipt) {
            this.deps.eventBus.emit("parcelDelivered", { parcel, routeId, receipt });
        }
    }
    getReceipts() {
        return this.deps.receiptLedger.getAllReceipts();
    }
    async dispatchDedicatedVehicle(parcel, vehicle, deliveryMs) {
        this.executionLedger.append({
            category: "side_effect",
            eventType: "side_effect.intent",
            action: "vehicle_dispatch",
            source: parcel.sourceNodeId,
            target: parcel.targetNodeId,
            ids: {
                requestId: parcel.sessionId,
                executionId: parcel.parcelId,
                correlationId: parcel.sessionId,
                sessionId: parcel.sessionId,
            },
            mode: "normal",
            status: "intent",
            sideEffect: { intent: true, completed: false, hints: [vehicle.vehicleType] },
        });
        this.deps.healthRegistry.registerVehicleHeartbeat(vehicle.vehicleId, true);
        this.deps.eventBus.emit("vehicleDispatched", { parcel, vehicle });
        const receipt = this.deps.receiptLedger.createReceipt(parcel, vehicle.vehicleType, vehicle.tunnel, "in_transit");
        this.deps.eventBus.emit("receiptCreated", { receipt });
        await sleep(deliveryMs);
        this.deps.receiptLedger.updateStatus(parcel.parcelId, "delivered", {
            timestamp: new Date().toISOString(),
            location: parcel.targetNodeId,
            note: `delivered_by_${vehicle.vehicleType}`,
        });
        const updated = this.deps.receiptLedger.getByParcelId(parcel.parcelId);
        if (updated) {
            this.deps.eventBus.emit("parcelDelivered", { parcel, receipt: updated });
        }
        this.deps.healthRegistry.registerVehicleHeartbeat(vehicle.vehicleId, false);
        this.executionLedger.append({
            category: "side_effect",
            eventType: "side_effect.completed",
            action: "vehicle_dispatch",
            source: parcel.sourceNodeId,
            target: parcel.targetNodeId,
            ids: {
                requestId: parcel.sessionId,
                executionId: parcel.parcelId,
                correlationId: parcel.sessionId,
                sessionId: parcel.sessionId,
            },
            mode: "normal",
            status: "completed",
            sideEffect: { intent: true, completed: true, hints: [vehicle.vehicleType] },
            metadata: { finalStatus: updated?.status ?? receipt.status },
        });
        this.executionLedger.append({
            category: "execution",
            eventType: "execution.completed",
            action: "dispatch_parcel",
            source: parcel.sourceNodeId,
            target: parcel.targetNodeId,
            ids: {
                requestId: parcel.sessionId,
                executionId: parcel.parcelId,
                correlationId: parcel.sessionId,
                sessionId: parcel.sessionId,
            },
            mode: "normal",
            status: "completed",
            metadata: { vehicle: vehicle.vehicleType, tunnel: vehicle.tunnel },
        });
        return updated ?? receipt;
    }
    resolveStopId(nodeId) {
        const routeStops = new Set(this.deps.routeRegistry.getAllRoutes().flatMap((route) => route.stops));
        return routeStops.has(nodeId) ? nodeId : "cat-hub";
    }
    toLedgerMode(outcome) {
        if (outcome === "reroute") {
            return "reroute";
        }
        if (outcome === "degraded_allow") {
            return "degraded";
        }
        if (outcome === "safe_mode_redirect") {
            return "safe_mode_redirect";
        }
        if (outcome === "require_audit") {
            return "audit_required";
        }
        return "normal";
    }
    getExecutionLedgerSnapshot() {
        return this.executionLedger.snapshot();
    }
    getCanonicalTimelineSnapshot() {
        return this.executionLedger.timelineSnapshot();
    }
}
exports.CourierService = CourierService;
