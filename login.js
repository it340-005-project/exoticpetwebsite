/**
 * @param {"login"|"register"|"mfa"} tab
 */
function switchTab(tab) {
  byId("login-panel").classList.toggle("active", tab === "login");
  byId("register-panel").classList.toggle("active", tab === "register");
  byId("mfa-panel").classList.toggle("active", tab === "mfa");
  document.querySelectorAll(".auth-tab").forEach((btn, index) => {
    btn.classList.toggle("active", (index === 0 && tab === "login") || (index === 1 && tab === "register"));
  });
}

/**
 * @param {string} id
 * @param {string} message
 * @param {"error"|"success"} type
 */
function showMsg(id, message, type) {
  const el = byId(id);
  el.textContent = message;
  el.className = type === "error" ? "auth-error is-visible" : "auth-success is-visible";
}

/**
 * @param {string} id
 */
function hideMsg(id) {
  const el = byId(id);
  el.className = el.className.includes("auth-error") ? "auth-error" : "auth-success";
  el.textContent = "";
}

/**
 * @param {unknown} data
 * @returns {{ qrCode: string, secret: string }}
 */
function asSetup(data) {
  if (!data || typeof data !== "object") throw new ApiError("Unexpected setup response.", 500);
  const row = /** @type {Record<string, unknown>} */ (data);
  const qrCode = String(row.qrCode ?? "");
  const secret = String(row.secret ?? "");
  if (!qrCode.startsWith("data:image/") || !secret) throw new ApiError("Unexpected setup response.", 500);
  return { qrCode, secret };
}

/**
 * @param {string} qrCode
 * @param {string} secret
 * @param {"setup"|"verify"} mode
 */
function showMfa(qrCode, secret, mode) {
  const box = byId("mfa-setup-box");
  const qr = byId("mfa-qr");
  const key = byId("mfa-secret");
  if (!(qr instanceof HTMLImageElement)) return;
  box.classList.toggle("is-hidden", mode !== "setup");
  qr.src = mode === "setup" ? qrCode : "";
  key.textContent = mode === "setup" ? secret : "";
  byId("mfa-panel").dataset.mode = mode;
  switchTab("mfa");
}

const SIGN_IN_UNAVAILABLE = "Signing in is not available.";

/**
 * @param {unknown} err
 * @param {string} fallback
 * @returns {string}
 */
function authErrorMessage(err, fallback) {
  if (isDatabaseUnavailable(err)) return SIGN_IN_UNAVAILABLE;
  return err instanceof Error ? err.message : fallback;
}

function markSignInUnavailable() {
  showMsg("login-error", SIGN_IN_UNAVAILABLE, "error");
  showMsg("register-error", SIGN_IN_UNAVAILABLE, "error");
  showMsg("mfa-error", SIGN_IN_UNAVAILABLE, "error");
  document.querySelectorAll("#login-panel input, #register-panel input, #mfa-panel input, #login-btn, #register-btn, #mfa-btn").forEach((node) => {
    if (node instanceof HTMLInputElement || node instanceof HTMLButtonElement) node.disabled = true;
  });
}

async function checkSignInAvailability() {
  try {
    await fetchJSON("/B_status");
  } catch (err) {
    if (isDatabaseUnavailable(err)) markSignInUnavailable();
  }
}

async function submitLogin() {
  hideMsg("login-error");
  hideMsg("login-success");
  const email = byId("login-email");
  const password = byId("login-password");
  if (!(email instanceof HTMLInputElement) || !(password instanceof HTMLInputElement)) return;
  if (!isEmail(email.value.trim()) || !password.value) {
    showMsg("login-error", "Enter a valid email and password.", "error");
    return;
  }
  try {
    const data = await fetchJSON("/B_login", {
      method: "POST",
      body: JSON.stringify({ email: email.value.trim(), password: password.value }),
    });
    if (!data || typeof data !== "object" || !("success" in data) || data.success !== true) {
      const message = data && typeof data === "object" && "message" in data ? String(data.message) : "Invalid email or password.";
      showMsg("login-error", message, "error");
      return;
    }
    if ("mfaSetup" in data && data.mfaSetup === true) {
      const setup = asSetup(data);
      showMfa(setup.qrCode, setup.secret, "setup");
      return;
    }
    showMfa("", "", "verify");
  } catch (err) {
    if (isDatabaseUnavailable(err)) markSignInUnavailable();
    else showMsg("login-error", authErrorMessage(err, "Something went wrong. Try again."), "error");
  }
}

async function submitRegister() {
  hideMsg("register-error");
  hideMsg("register-success");
  const name = byId("reg-name");
  const email = byId("reg-email");
  const password = byId("reg-password");
  const confirm = byId("reg-confirm");
  if (!(name instanceof HTMLInputElement) || !(email instanceof HTMLInputElement) || !(password instanceof HTMLInputElement) || !(confirm instanceof HTMLInputElement)) return;
  if (!name.value.trim() || !isEmail(email.value.trim()) || !password.value || !confirm.value) {
    showMsg("register-error", "Please fill in all fields.", "error");
    return;
  }
  if (password.value !== confirm.value) {
    showMsg("register-error", "Passwords do not match.", "error");
    return;
  }
  if (!isPassword(password.value)) {
    showMsg("register-error", "Password must be at least 6 characters.", "error");
    return;
  }
  try {
    const data = await fetchJSON("/B_register", {
      method: "POST",
      body: JSON.stringify({ name: name.value.trim(), email: email.value.trim(), password: password.value }),
    });
    if (!data || typeof data !== "object" || !("success" in data) || data.success !== true) {
      const message = data && typeof data === "object" && "message" in data ? String(data.message) : "Registration failed.";
      showMsg("register-error", message, "error");
      return;
    }
    const setup = asSetup(data);
    showMfa(setup.qrCode, setup.secret, "setup");
  } catch (err) {
    if (isDatabaseUnavailable(err)) markSignInUnavailable();
    else showMsg("register-error", authErrorMessage(err, "Something went wrong. Try again."), "error");
  }
}

async function submitMfa() {
  hideMsg("mfa-error");
  const codeInput = byId("mfa-code");
  if (!(codeInput instanceof HTMLInputElement) || !isMfaCode(codeInput.value.trim())) {
    showMsg("mfa-error", "Enter the 6-digit code from your authenticator app.", "error");
    return;
  }
  const mode = byId("mfa-panel").dataset.mode === "setup" ? "setup" : "verify";
  const path = mode === "setup" ? "/B_mfa_setup" : "/B_mfa_verify";
  try {
    const data = await fetchJSON(path, { method: "POST", body: JSON.stringify({ code: codeInput.value.trim() }) });
    const user = asUser(data && typeof data === "object" ? { user: "user" in data ? data.user : null } : null);
    const name = user ? user.name : "there";
    showMsg("mfa-success", "Welcome, " + name + ". Redirecting...", "success");
    window.setTimeout(() => {
      window.location.href = nextUrl();
    }, 900);
  } catch (err) {
    if (isDatabaseUnavailable(err)) markSignInUnavailable();
    else showMsg("mfa-error", authErrorMessage(err, "That code was not accepted."), "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  checkSignInAvailability();
  document.querySelectorAll("[data-tab]").forEach((node) => {
    node.addEventListener("click", () => {
      const tab = node instanceof HTMLElement ? node.dataset.tab : "";
      if (tab === "login" || tab === "register") switchTab(tab);
    });
  });
  byId("login-btn").addEventListener("click", () => { submitLogin(); });
  byId("register-btn").addEventListener("click", () => { submitRegister(); });
  byId("mfa-btn").addEventListener("click", () => { submitMfa(); });
  [
    ["login-email", "login-btn"],
    ["login-password", "login-btn"],
    ["reg-name", "register-btn"],
    ["reg-email", "register-btn"],
    ["reg-password", "register-btn"],
    ["reg-confirm", "register-btn"],
    ["mfa-code", "mfa-btn"],
  ].forEach(([field, btn]) => {
    byId(field).addEventListener("keydown", (event) => {
      if (event instanceof KeyboardEvent && event.key === "Enter") byId(btn).click();
    });
  });
});
