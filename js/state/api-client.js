import { formatLocalDate } from "./progress.js";

let expectedUserId = null;

export function setExpectedUserId(userId) {
  expectedUserId = userId || null;
}

async function apiRequest(
  path,
  { method = "GET", body = undefined, keepalive = false, sendExpectedUser = true } = {}
) {
  const opts = {
    method,
    credentials: "same-origin",
    keepalive: Boolean(keepalive),
    headers: {},
  };
  if (sendExpectedUser && expectedUserId && method !== "GET" && method !== "HEAD") {
    opts.headers["X-TQ-User-Id"] = expectedUserId;
  }
  if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(path, opts);
  } catch (err) {
    const netErr = new Error("Network error contacting TurtleQuest server.");
    netErr.isNetwork = true;
    netErr.cause = err;
    throw netErr;
  }

  const contentType = res.headers.get("Content-Type") || "";
  if (!contentType.includes("application/json")) {
    const nonJsonErr = new Error(`Unexpected non-JSON response (${res.status})`);
    nonJsonErr.status = res.status;
    nonJsonErr.notCloud = res.status === 404 || res.status === 200;
    throw nonJsonErr;
  }

  const data = await res.json();
  if (!res.ok) {
    const apiErr = new Error(data?.error || `Request failed (${res.status})`);
    apiErr.status = res.status;
    apiErr.data = data;
    throw apiErr;
  }
  return data;
}

export async function fetchAuthMe() {
  try {
    const data = await apiRequest("/api/auth/me", { sendExpectedUser: false });
    if (!data || data.cloudEnabled !== true) {
      return { cloudEnabled: false, signupRequiresInvite: false, user: null, transientError: false };
    }
    return {
      cloudEnabled: true,
      signupRequiresInvite: Boolean(data.signupRequiresInvite),
      user: data.user || null,
      transientError: false,
    };
  } catch (err) {
    if (err?.notCloud || err?.status === 404) {
      return { cloudEnabled: false, signupRequiresInvite: false, user: null, transientError: false };
    }
    return {
      cloudEnabled: true,
      signupRequiresInvite: false,
      user: null,
      transientError: true,
    };
  }
}

export function registerAccount({ username, pin, inviteCode = "" }) {
  return apiRequest("/api/auth/register", {
    method: "POST",
    sendExpectedUser: false,
    body: {
      username,
      pin,
      inviteCode,
      clientDate: formatLocalDate(),
    },
  });
}

export function loginAccount({ username, pin }) {
  return apiRequest("/api/auth/login", {
    method: "POST",
    sendExpectedUser: false,
    body: {
      username,
      pin,
      clientDate: formatLocalDate(),
    },
  });
}

export function logoutAccount() {
  return apiRequest("/api/auth/logout", {
    method: "POST",
    sendExpectedUser: false,
  });
}

export function fetchCloudState() {
  const dateStr = encodeURIComponent(formatLocalDate());
  return apiRequest(`/api/state?date=${dateStr}`, { sendExpectedUser: false });
}

export function completeCloudLesson({ nodeId, bonusEarned }) {
  return apiRequest("/api/progress/complete", {
    method: "POST",
    body: {
      nodeId,
      bonusEarned: Boolean(bonusEarned),
      clientDate: formatLocalDate(),
    },
  });
}

export function buyOrEquipCloudSkin({ skinId }) {
  return apiRequest("/api/shop/buy", {
    method: "POST",
    body: {
      skinId,
      clientDate: formatLocalDate(),
    },
  });
}

export function updateCloudPreferences(patch) {
  return apiRequest("/api/preferences", {
    method: "PATCH",
    body: {
      ...patch,
      clientDate: formatLocalDate(),
    },
  });
}

export function saveCloudDraft(nodeId, code, { keepalive = false } = {}) {
  return apiRequest(`/api/drafts/${encodeURIComponent(nodeId)}`, {
    method: "PUT",
    keepalive,
    body: { code },
  });
}

export function saveCloudSandboxCode(code, { keepalive = false } = {}) {
  return apiRequest("/api/sandbox/code", {
    method: "PUT",
    keepalive,
    body: { code },
  });
}

export function saveCloudGalleryItem({ name, code }) {
  return apiRequest("/api/sandbox/gallery", {
    method: "POST",
    body: { name, code },
  });
}

export function deleteCloudGalleryItem(projectId) {
  return apiRequest(`/api/sandbox/gallery/${encodeURIComponent(projectId)}`, {
    method: "DELETE",
  });
}

export function importCloudState({ state, jsonText, mode = "replace" }) {
  return apiRequest("/api/progress/import", {
    method: "POST",
    body: {
      state,
      jsonText,
      mode,
      clientDate: formatLocalDate(),
    },
  });
}
