/**
 * @param {string} id
 * @param {string} message
 */
function accountNote(id, message) {
  const el = document.getElementById(id);
  if (el) el.textContent = message;
}

/**
 * @param {UserProfile} user
 */
function fillAccount(user) {
  const name = document.getElementById("account-name");
  const email = document.getElementById("account-email-view");
  if (name) name.textContent = user.name;
  if (email) email.textContent = user.email;
  const street = document.getElementById("addr-street");
  const apartment = document.getElementById("addr-apartment");
  const city = document.getElementById("addr-city");
  const state = document.getElementById("addr-state");
  const zip = document.getElementById("addr-zip");
  const phone = document.getElementById("addr-phone");
  if (street instanceof HTMLInputElement) street.value = user.street;
  if (apartment instanceof HTMLInputElement) apartment.value = user.apartment;
  if (city instanceof HTMLInputElement) city.value = user.city;
  if (state instanceof HTMLInputElement) state.value = user.state;
  if (zip instanceof HTMLInputElement) zip.value = user.zip;
  if (phone instanceof HTMLInputElement) phone.value = user.phone;
}

/**
 * @param {string} qrCode
 * @param {string} secret
 */
function showReset(qrCode, secret) {
  const box = byId("mfa-reset-box");
  const qr = byId("account-mfa-qr");
  box.classList.remove("is-hidden");
  if (qr instanceof HTMLImageElement) qr.src = qrCode;
  byId("account-mfa-secret").textContent = secret;
}

async function loadAccount() {
  try {
    const data = await fetchJSON("/B_account");
    const user = asUser(data && typeof data === "object" ? { user: "user" in data ? data.user : null } : null);
    if (!user) {
      window.location.href = "/login?next=/my-account";
      return;
    }
    fillAccount(user);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      window.location.href = "/login?next=/my-account";
      return;
    }
    accountNote("account-status", err instanceof Error ? err.message : "Could not load your account.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const emailForm = document.getElementById("email-form");
  const passwordForm = document.getElementById("password-form");
  const addressForm = document.getElementById("address-form");
  if (emailForm instanceof HTMLFormElement) {
    emailForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const email = byId("new-email");
      const current = byId("email-current-password");
      if (!(email instanceof HTMLInputElement) || !(current instanceof HTMLInputElement)) return;
      if (!isEmail(email.value.trim()) || !current.value) {
        accountNote("email-note", "Enter a valid email and your current password.");
        return;
      }
      try {
        await fetchJSON("/B_account", {
          method: "PUT",
          body: JSON.stringify({ email: email.value.trim(), currentPassword: current.value }),
        });
        accountNote("email-note", "Email updated.");
        await loadAccount();
      } catch (err) {
        accountNote("email-note", err instanceof Error ? err.message : "Could not update email.");
      }
    });
  }
  if (passwordForm instanceof HTMLFormElement) {
    passwordForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const next = byId("new-password");
      const current = byId("password-current");
      if (!(next instanceof HTMLInputElement) || !(current instanceof HTMLInputElement)) return;
      if (!isPassword(next.value) || !current.value) {
        accountNote("password-note", "Use your current password and a new password of at least 6 characters.");
        return;
      }
      try {
        await fetchJSON("/B_account", {
          method: "PUT",
          body: JSON.stringify({ password: next.value, currentPassword: current.value }),
        });
        accountNote("password-note", "Password updated.");
        passwordForm.reset();
      } catch (err) {
        accountNote("password-note", err instanceof Error ? err.message : "Could not update password.");
      }
    });
  }
  if (addressForm instanceof HTMLFormElement) {
    addressForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const street = byId("addr-street");
      const apartment = byId("addr-apartment");
      const city = byId("addr-city");
      const state = byId("addr-state");
      const zip = byId("addr-zip");
      const phone = byId("addr-phone");
      if (!(street instanceof HTMLInputElement) || !(apartment instanceof HTMLInputElement) || !(city instanceof HTMLInputElement) || !(state instanceof HTMLInputElement) || !(zip instanceof HTMLInputElement) || !(phone instanceof HTMLInputElement)) return;
      try {
        await fetchJSON("/B_account", {
          method: "PUT",
          body: JSON.stringify({
            street: street.value.trim(),
            apartment: apartment.value.trim(),
            city: city.value.trim(),
            state: state.value.trim(),
            zip: zip.value.trim(),
            phone: phone.value.trim(),
          }),
        });
        accountNote("address-note", "Address updated.");
      } catch (err) {
        accountNote("address-note", err instanceof Error ? err.message : "Could not update address.");
      }
    });
  }
  const resetBtn = document.getElementById("mfa-reset-btn");
  if (resetBtn) {
    resetBtn.addEventListener("click", async () => {
      try {
        const data = await fetchJSON("/B_mfa_reset", { method: "POST" });
        if (!data || typeof data !== "object") throw new ApiError("Unexpected setup response.", 500);
        const row = /** @type {Record<string, unknown>} */ (data);
        const qrCode = String(row.qrCode ?? "");
        const secret = String(row.secret ?? "");
        if (!qrCode.startsWith("data:image/") || !secret) throw new ApiError("Unexpected setup response.", 500);
        showReset(qrCode, secret);
      } catch (err) {
        accountNote("mfa-note", err instanceof Error ? err.message : "Could not start a new authenticator setup.");
      }
    });
  }
  const confirm = document.getElementById("mfa-confirm-form");
  if (confirm instanceof HTMLFormElement) {
    confirm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const current = byId("mfa-current");
      const next = byId("mfa-next");
      if (!(current instanceof HTMLInputElement) || !(next instanceof HTMLInputElement)) return;
      if (!isMfaCode(current.value.trim()) || !isMfaCode(next.value.trim())) {
        accountNote("mfa-note", "Enter both 6-digit codes.");
        return;
      }
      try {
        await fetchJSON("/B_mfa_reset_confirm", {
          method: "POST",
          body: JSON.stringify({ currentCode: current.value.trim(), code: next.value.trim() }),
        });
        accountNote("mfa-note", "Authenticator updated.");
        byId("mfa-reset-box").classList.add("is-hidden");
        confirm.reset();
      } catch (err) {
        accountNote("mfa-note", err instanceof Error ? err.message : "Could not replace the authenticator.");
      }
    });
  }
  loadAccount();
});
