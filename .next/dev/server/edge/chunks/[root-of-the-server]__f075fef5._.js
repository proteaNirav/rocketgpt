(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push(["chunks/[root-of-the-server]__f075fef5._.js",
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[project]/lib/edge/test.ts [app-edge-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>handler
]);
async function handler(_req) {
    return {
        message: "RocketGPT Edge Function OK ✅"
    };
}
}),
"[project]/app/api/edge/[fn]/route.ts [app-edge-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "POST",
    ()=>POST,
    "runtime",
    ()=>runtime
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/api/server.js [app-edge-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/server/web/exports/index.js [app-edge-route] (ecmascript)");
;
const runtime = "edge";
// Explicit registry avoids bundler hangs from template-literal imports
const registry = {
    test: ()=>Promise.resolve().then(()=>__turbopack_context__.i("[project]/lib/edge/test.ts [app-edge-route] (ecmascript)"))
};
async function run(fn, req) {
    const loader = registry[fn];
    if (!loader) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: `Function '${fn}' not found`
        }, {
            status: 404
        });
    }
    const mod = await loader();
    const result = await mod.default(req);
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        success: true,
        data: result
    });
}
async function GET(req, ctx) {
    const { fn } = await ctx.params;
    if (!fn) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        error: "Missing function name"
    }, {
        status: 400
    });
    try {
        return await run(fn, req);
    } catch (err) {
        console.error("Edge route GET error:", err);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: err?.message ?? "Internal error"
        }, {
            status: 500
        });
    }
}
async function POST(req, ctx) {
    return GET(req, ctx);
}
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__f075fef5._.js.map