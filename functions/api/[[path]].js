import { handleApiRequest } from "../../worker/index.js";

export async function onRequest(context) {
  try {
    return await handleApiRequest(context.request, context.env);
  } catch (err) {
    console.error("Pages Function error:", err);
    return new Response(JSON.stringify({ ok: false, error: "Internal server error." }), {
      status: 500,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  }
}
