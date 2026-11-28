import {
  buildClearSessionCookie,
  buildSessionCookie,
  getAuthenticatedSession,
  isInviteRequired,
  loginUser,
  logoutSession,
  registerUser,
} from "./auth.js";
import {
  buyOrEquipSkinForUser,
  completeLessonForUser,
  deleteSandboxProjectForUser,
  hydrateUserState,
  importStateForUser,
  saveSandboxProjectForUser,
  updatePreferencesForUser,
  updateSandboxCodeForUser,
  upsertDraftForUser,
} from "./db.js";

function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "same-origin",
      ...extraHeaders,
    },
  });
}

function safeDecodeParam(raw) {
  try {
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
}

async function readJsonBody(request) {
  const contentType = request.headers.get("Content-Type") || "";
  if (contentType && !contentType.toLowerCase().includes("application/json")) {
    return { ok: false, status: 415, error: "Expected application/json request body." };
  }
  const contentLength = Number(request.headers.get("Content-Length") || "0");
  if (contentLength > 512 * 1024) {
    return { ok: false, status: 413, error: "Request body is too large." };
  }
  try {
    const text = await request.text();
    if (!text) return { ok: true, data: {} };
    if (text.length > 512 * 1024) {
      return { ok: false, status: 413, error: "Request body is too large." };
    }
    if (!contentType.toLowerCase().includes("application/json")) {
      return { ok: false, status: 415, error: "Expected application/json Content-Type header." };
    }
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON request body." };
  }
}

function checkSameOriginMutation(request) {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return true;
  }

  const secFetchSite = request.headers.get("Sec-Fetch-Site");
  if (secFetchSite && secFetchSite !== "same-origin" && secFetchSite !== "none") {
    return false;
  }

  let reqOrigin;
  try {
    reqOrigin = new URL(request.url).origin;
  } catch {
    return false;
  }

  const origin = request.headers.get("Origin");
  if (origin) {
    if (origin !== reqOrigin) return false;
  } else {
    const referer = request.headers.get("Referer");
    if (referer) {
      try {
        if (new URL(referer).origin !== reqOrigin) return false;
      } catch {
        return false;
      }
    }
  }
  return true;
}

export async function handleApiRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toUpperCase();

  if (!checkSameOriginMutation(request)) {
    return jsonResponse({ ok: false, error: "Cross-origin requests are not allowed." }, 403);
  }

  // Public Auth & Discovery Routes
  if (path === "/api/auth/me" && method === "GET") {
    const session = await getAuthenticatedSession(request, env);
    return jsonResponse({
      ok: true,
      cloudEnabled: true,
      signupRequiresInvite: isInviteRequired(env),
      user: session ? session.user : null,
    });
  }

  if (path === "/api/auth/register" && method === "POST") {
    const bodyRes = await readJsonBody(request);
    if (!bodyRes.ok) return jsonResponse({ ok: false, error: bodyRes.error }, bodyRes.status || 400);

    const res = await registerUser(request, env, bodyRes.data);
    if (!res.ok) {
      const headers = res.retryAfterSeconds
        ? { "Retry-After": String(res.retryAfterSeconds) }
        : {};
      return jsonResponse({ ok: false, error: res.error }, res.status || 400, headers);
    }
    return jsonResponse(
      { ok: true, user: res.user, state: res.state },
      201,
      { "Set-Cookie": buildSessionCookie(res.sessionToken, request.url) }
    );
  }

  if (path === "/api/auth/login" && method === "POST") {
    const bodyRes = await readJsonBody(request);
    if (!bodyRes.ok) return jsonResponse({ ok: false, error: bodyRes.error }, bodyRes.status || 400);

    const res = await loginUser(request, env, bodyRes.data);
    if (!res.ok) {
      const headers = res.retryAfterSeconds
        ? { "Retry-After": String(res.retryAfterSeconds) }
        : {};
      return jsonResponse({ ok: false, error: res.error }, res.status || 401, headers);
    }
    return jsonResponse(
      { ok: true, user: res.user, state: res.state },
      200,
      { "Set-Cookie": buildSessionCookie(res.sessionToken, request.url) }
    );
  }

  if (path === "/api/auth/logout" && method === "POST") {
    await logoutSession(request, env);
    return jsonResponse(
      { ok: true },
      200,
      { "Set-Cookie": buildClearSessionCookie(request.url) }
    );
  }

  // Authenticated Routes
  const session = await getAuthenticatedSession(request, env);
  if (!session) {
    return jsonResponse({ ok: false, error: "Please sign in first." }, 401);
  }
  const userId = session.user.id;

  // Defense-in-depth: block stale tabs or mid-switch mutations from writing into another user's account
  if (method !== "GET" && method !== "HEAD") {
    const expectedUserId = request.headers.get("X-TQ-User-Id");
    if (expectedUserId && expectedUserId !== userId) {
      return jsonResponse(
        {
          ok: false,
          code: "USER_MISMATCH",
          error: "Your account changed in another tab. Refresh the page to sync!",
        },
        409
      );
    }
  }

  if (path === "/api/state" && method === "GET") {
    const clientDate = url.searchParams.get("date");
    const hydrated = await hydrateUserState(env.DB, userId, clientDate);
    if (!hydrated) {
      return jsonResponse({ ok: false, error: "User account not found." }, 404);
    }
    return jsonResponse({ ok: true, user: hydrated.user, state: hydrated.state });
  }

  if (path === "/api/progress/complete" && method === "POST") {
    const bodyRes = await readJsonBody(request);
    if (!bodyRes.ok) return jsonResponse({ ok: false, error: bodyRes.error }, bodyRes.status || 400);

    const res = await completeLessonForUser(env.DB, userId, {
      nodeId: bodyRes.data?.nodeId,
      bonusEarned: bodyRes.data?.bonusEarned,
      clientDate: bodyRes.data?.clientDate,
    });
    if (!res.ok) return jsonResponse({ ok: false, error: res.error }, res.status || 400);
    return jsonResponse(res);
  }

  if (path === "/api/shop/buy" && method === "POST") {
    const bodyRes = await readJsonBody(request);
    if (!bodyRes.ok) return jsonResponse({ ok: false, error: bodyRes.error }, bodyRes.status || 400);

    const res = await buyOrEquipSkinForUser(env.DB, userId, {
      skinId: bodyRes.data?.skinId,
      clientDate: bodyRes.data?.clientDate,
    });
    if (!res.ok) return jsonResponse({ ok: false, error: res.error }, res.status || 400);
    return jsonResponse(res.result);
  }

  if (path === "/api/preferences" && method === "PATCH") {
    const bodyRes = await readJsonBody(request);
    if (!bodyRes.ok) return jsonResponse({ ok: false, error: bodyRes.error }, bodyRes.status || 400);

    const res = await updatePreferencesForUser(
      env.DB,
      userId,
      bodyRes.data,
      bodyRes.data?.clientDate
    );
    if (!res.ok) return jsonResponse({ ok: false, error: res.error }, res.status || 400);
    return jsonResponse({ ok: true, state: res.state });
  }

  if (path.startsWith("/api/drafts/") && method === "PUT") {
    const nodeId = safeDecodeParam(path.slice("/api/drafts/".length));
    if (!nodeId) {
      return jsonResponse({ ok: false, error: "Invalid lesson ID in URL." }, 400);
    }
    const bodyRes = await readJsonBody(request);
    if (!bodyRes.ok) return jsonResponse({ ok: false, error: bodyRes.error }, bodyRes.status || 400);

    const res = await upsertDraftForUser(env.DB, userId, nodeId, bodyRes.data?.code);
    if (!res.ok) return jsonResponse({ ok: false, error: res.error }, res.status || 400);
    return jsonResponse({ ok: true });
  }

  if (path === "/api/sandbox/code" && method === "PUT") {
    const bodyRes = await readJsonBody(request);
    if (!bodyRes.ok) return jsonResponse({ ok: false, error: bodyRes.error }, bodyRes.status || 400);

    const res = await updateSandboxCodeForUser(env.DB, userId, bodyRes.data?.code);
    if (!res.ok) return jsonResponse({ ok: false, error: res.error }, res.status || 400);
    return jsonResponse({ ok: true });
  }

  if (path === "/api/sandbox/gallery" && method === "POST") {
    const bodyRes = await readJsonBody(request);
    if (!bodyRes.ok) return jsonResponse({ ok: false, error: bodyRes.error }, bodyRes.status || 400);

    const res = await saveSandboxProjectForUser(env.DB, userId, bodyRes.data || {});
    if (!res.ok) return jsonResponse({ ok: false, error: res.error }, res.status || 400);
    return jsonResponse({ ok: true, id: res.id, gallery: res.gallery });
  }

  if (path.startsWith("/api/sandbox/gallery/") && method === "DELETE") {
    const projectId = safeDecodeParam(path.slice("/api/sandbox/gallery/".length));
    if (!projectId) {
      return jsonResponse({ ok: false, error: "Invalid gallery item ID in URL." }, 400);
    }
    const res = await deleteSandboxProjectForUser(env.DB, userId, projectId);
    if (!res.ok) return jsonResponse({ ok: false, error: res.error }, res.status || 400);
    return jsonResponse({ ok: true, gallery: res.gallery });
  }

  if (path === "/api/progress/import" && method === "POST") {
    const bodyRes = await readJsonBody(request);
    if (!bodyRes.ok) return jsonResponse({ ok: false, error: bodyRes.error }, bodyRes.status || 400);

    let parsedState = bodyRes.data?.state;
    if (!parsedState && typeof bodyRes.data?.jsonText === "string") {
      try {
        parsedState = JSON.parse(bodyRes.data.jsonText);
      } catch {
        return jsonResponse({ ok: false, error: "That file is not valid JSON." }, 400);
      }
    }

    const mode = bodyRes.data?.mode === "replace" ? "replace" : "merge";
    const res = await importStateForUser(env.DB, userId, parsedState, {
      mode,
      clientDate: bodyRes.data?.clientDate,
    });
    if (!res.ok) return jsonResponse({ ok: false, error: res.error }, res.status || 400);
    return jsonResponse({ ok: true, state: res.state });
  }

  return jsonResponse({ ok: false, error: "API route not found." }, 404);
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      if (url.pathname.startsWith("/api/")) {
        return await handleApiRequest(request, env);
      }
      if (env.ASSETS) {
        return env.ASSETS.fetch(request);
      }
      return new Response("Not Found", { status: 404 });
    } catch (err) {
      console.error("Worker error:", err);
      return jsonResponse({ ok: false, error: "Internal server error." }, 500);
    }
  },
};
