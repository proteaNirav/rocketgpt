export function corsHeaders(origin: string | null) {
  const allow = origin ?? "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400"
  } as Record<string, string>;
}
export function ok<T>(data: T, origin: string | null) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) }
  });
}
export function noContent(origin: string | null) {
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}
