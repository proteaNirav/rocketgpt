(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push(["chunks/[root-of-the-server]__ad6dfa58._.js",
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[project]/lib/edge/ping.ts [app-edge-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ping",
    ()=>ping
]);
async function ping(_req) {
    const body = {
        status: "ok",
        time: new Date().toISOString()
    };
    const headers = new Headers();
    headers.set("Content-Type", "application/json; charset=utf-8");
    headers.set("Cache-Control", "no-store");
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return new Response(JSON.stringify(body), {
        status: 200,
        headers
    });
}
}),
"[project]/app/api/edge/[fn]/route.ts [app-edge-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "OPTIONS",
    ()=>OPTIONS,
    "POST",
    ()=>POST,
    "preferredRegion",
    ()=>preferredRegion,
    "runtime",
    ()=>runtime
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$edge$2f$ping$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/edge/ping.ts [app-edge-route] (ecmascript)");
;
const runtime = "edge";
const preferredRegion = [
    "bom1",
    "sin1"
];
/** Minimal CORS for placeholder responses */ function withCors(init = {}) {
    const headers = new Headers(init.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    headers.set("Content-Type", "application/json; charset=utf-8");
    return {
        ...init,
        headers
    };
}
function placeholder(fn) {
    return {
        ok: true,
        message: "Edge handler online. Only /ping is live in Step 2.1; others come next.",
        requested: fn,
        time: new Date().toISOString(),
        runtime: "edge"
    };
}
async function dispatch(req, fn) {
    if (fn === "ping") return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$edge$2f$ping$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["ping"])(req);
    return new Response(JSON.stringify(placeholder(fn)), withCors({
        status: 200
    }));
}
async function GET(req, ctx) {
    const { fn } = await ctx.params; // <-- await required on Next.js 16
    return dispatch(req, fn);
}
async function POST(req, ctx) {
    const { fn } = await ctx.params; // <-- await required
    return dispatch(req, fn);
}
async function OPTIONS() {
    return new Response(null, withCors({
        status: 204
    }));
}
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__ad6dfa58._.js.map