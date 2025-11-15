(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push(["chunks/[root-of-the-server]__f2b15f93._.js",
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[project]/middleware.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "config",
    ()=>config,
    "middleware",
    ()=>middleware
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/api/server.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/server/web/exports/index.js [middleware-edge] (ecmascript)");
;
/**
 * Central CORS for Edge endpoints
 * - Handles OPTIONS preflight
 * - Adds CORS headers on all responses
 * - Passthrough of Authorization and common auth headers
 *
 * Scope: /api/edge/*
 */ const ALLOW_ORIGIN = "*"; // Phase 1: permissive; tighten in Phase 2
const ALLOW_METHODS = "GET,POST,OPTIONS";
const ALLOW_HEADERS = "Content-Type, Authorization";
const MAX_AGE = "600";
function applyCorsHeaders(res) {
    res.headers.set("Access-Control-Allow-Origin", ALLOW_ORIGIN);
    res.headers.set("Access-Control-Allow-Methods", ALLOW_METHODS);
    res.headers.set("Access-Control-Allow-Headers", ALLOW_HEADERS);
    res.headers.set("Access-Control-Max-Age", MAX_AGE);
    return res;
}
async function middleware(req) {
    // Preflight
    if (req.method === "OPTIONS") {
        const preflight = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"](null, {
            status: 204
        });
        return applyCorsHeaders(preflight);
    }
    // Forward auth-related headers (optional; explicit in case upstream requires)
    const fwd = new Headers(req.headers);
    // (No mutation needed for Authorization; kept to signal intent)
    // fwd.set("Authorization", req.headers.get("Authorization") ?? "");
    const res = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next({
        request: {
            headers: fwd
        }
    });
    return applyCorsHeaders(res);
}
const config = {
    matcher: [
        "/api/edge/:path*"
    ]
};
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__f2b15f93._.js.map