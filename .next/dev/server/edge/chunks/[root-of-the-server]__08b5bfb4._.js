(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push(["chunks/[root-of-the-server]__08b5bfb4._.js",
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
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
const runtime = "edge";
const preferredRegion = [
    "bom1",
    "sin1"
];
function withCors(init = {}) {
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
        message: "Edge handler online. Specific handlers come in Step 2.",
        requested: fn,
        time: new Date().toISOString(),
        runtime: "edge"
    };
}
async function GET(_req, ctx) {
    return new Response(JSON.stringify(placeholder(ctx.params.fn)), withCors({
        status: 200
    }));
}
async function POST(_req, ctx) {
    return new Response(JSON.stringify(placeholder(ctx.params.fn)), withCors({
        status: 200
    }));
}
async function OPTIONS() {
    return new Response(null, withCors({
        status: 204
    }));
}
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__08b5bfb4._.js.map