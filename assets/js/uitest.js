/* Begin uitest.js - UI-only controller for uitest.html */

/* Begin constants */
const DEFAULTS_JSON_PATH = "assets/json-data/uitest.json";

const FORM_IDS = {
  emailLookupForm: "emailLookupForm",
  loginForm: "loginForm",
  emailConfirmForm: "emailConfirmForm",
  phoneConfirmForm: "phoneConfirmForm",
  profileForm: "profileForm",
  cookieForm: "cookieForm",
  tosForm: "tosForm",
  controllerForm: "uiControllerForm"
};

const BANNER_IDS = {
  loggedInBanner: "loggedInBanner",
  emailVerifiedBanner: "emailVerifiedBanner",
  phoneVerifiedBanner: "phoneVerifiedBanner",
  profileStatusBanner: "profileStatusBanner",
  cookieBanner: "cookieBanner",
  tosBanner: "tosBanner"
};

const BUTTON_IDS = {
  createProfile: "btnCreateProfile",
  removeProfile: "btnRemoveProfile",
  openCookie: "openCookieBtn",
  resetCookies: "resetCookiesBtn",
  openTos: "openTosBtn",
  resetTos: "resetTosBtn"
};

const FIELD_IDS = {
  emailLookupInput: "email",
  loginEmailInput: "loginEmail",
  loginPasswordInput: "loginPassword",
  emailConfirmEmailInput: "emailConfirm",
  emailConfirmCodeInput: "emailCode",
  phoneInput: "phone",
  phoneCodeInput: "phoneCode",
  verifiedEmailValue: "verifiedEmailValue",
  verifiedPhoneValue: "verifiedPhoneValue"
};

const TOGGLE_NAMES = [
  "emailVerified",
  "phoneVerified",
  "loggedIn",
  "jwtPresent",
  "userProfile",
  "emailLookup",
  "cookieAccepted",
  "tosAccepted"
];

const BUILT_IN_DEFAULTS = {
  emailVerified: false,
  phoneVerified: false,
  loggedIn: false,
  jwtPresent: false,
  userProfile: false,
  emailLookup: true,
  cookieAccepted: false,
  tosAccepted: false
};

let loadedDefaults = null;
/* End constants */


/* Begin DOM helpers */
function byId(id) {
  const el = document.getElementById(id);
  if (!el) console.warn(`[uitest.js] Missing #${id}`);
  return el;
}
function show(id) { const el = byId(id); if (el) el.style.display = ""; }
function hide(id) { const el = byId(id); if (el) el.style.display = "none"; }
function setText(id, text) { const el = byId(id); if (el) el.textContent = text ?? ""; }
function getQueryParam(name) { const p = new URLSearchParams(window.location.search); return p.get(name); }

function setBannerClass(el, alertTypeClass) {
  if (!el) return;
  [...el.classList].forEach(c => { if (c.startsWith("alert-")) el.classList.remove(c); });
  if (!el.classList.contains("alert")) el.classList.add("alert");
  if (alertTypeClass) el.classList.add(alertTypeClass);
}
function renderBanner({ id, visible, alertTypeClass, text, htmlSetter }) {
  const el = byId(id);
  if (!el) return;
  if (visible) {
    setBannerClass(el, alertTypeClass || "alert-success");
    if (typeof htmlSetter === "function") htmlSetter(el);
    else if (typeof text === "string") el.textContent = text;
    show(id);
  } else {
    hide(id);
  }
}
/* End DOM helpers */


/* Begin radio helpers */
function readRadioBoolean(name) {
  const sel = document.querySelector(`input[name="${name}"]:checked`);
  return sel ? (sel.value === "true") : false; // strict boolean, default false
}
function setRadioBoolean(name, value) {
  const v = value ? "true" : "false";
  const t = document.querySelector(`input[name="${name}"][value="${v}"]`);
  const o = document.querySelector(`input[name="${name}"][value="${value ? "false" : "true"}"]`);
  if (t) t.checked = true;
  if (o) o.checked = false;
}
function readAllToggles() {
  const s = {};
  TOGGLE_NAMES.forEach(n => s[n] = !!readRadioBoolean(n));
  return s;
}
function syncRadiosFromMap(map) {
  TOGGLE_NAMES.forEach(n => { if (Object.prototype.hasOwnProperty.call(map, n)) setRadioBoolean(n, !!map[n]); });
}
/* End radio helpers */


// Cache of the most recent full toggle state object (strict booleans)
let CURRENT_RENDER_STATE = { ...BUILT_IN_DEFAULTS };


/* Begin UI rules */
function deriveEmailForBanner() {
  return (
    byId(FIELD_IDS.emailConfirmEmailInput)?.value?.trim() ||
    byId(FIELD_IDS.loginEmailInput)?.value?.trim() ||
    byId(FIELD_IDS.emailLookupInput)?.value?.trim() ||
    ""
  );
}
function derivePhoneForBanner() { return byId(FIELD_IDS.phoneInput)?.value?.trim() || ""; }

// false => show form, hide banner. true => hide form, show banner.

function renderAccountAccess(state) {
  try {
    state.emailLookup === true ? show(FORM_IDS.emailLookupForm) : hide(FORM_IDS.emailLookupForm);
    state.loggedIn === false ? show(FORM_IDS.loginForm) : hide(FORM_IDS.loginForm);
    renderBanner({
      id: BANNER_IDS.loggedInBanner,
      visible: !!state.loggedIn,
      alertTypeClass: "alert-success",
      text: "Logged in successfully."
    });
  } catch (e) { console.error("[uitest.js] renderAccountAccess error", e); }
}

function renderEmailVerification(state) {
  try {
    state.emailVerified === false ? show(FORM_IDS.emailConfirmForm) : hide(FORM_IDS.emailConfirmForm);
    renderBanner({
      id: BANNER_IDS.emailVerifiedBanner,
      visible: !!state.emailVerified,
      alertTypeClass: "alert-success",
      htmlSetter: () => setText(FIELD_IDS.verifiedEmailValue, deriveEmailForBanner())
    });
  } catch (e) { console.error("[uitest.js] renderEmailVerification error", e); }
}

function renderPhoneVerification(state) {
  try {
    const showForm = state.jwtPresent === true && state.phoneVerified === false;
    showForm ? show(FORM_IDS.phoneConfirmForm) : hide(FORM_IDS.phoneConfirmForm);
    renderBanner({
      id: BANNER_IDS.phoneVerifiedBanner,
      visible: !!state.phoneVerified,
      alertTypeClass: "alert-success",
      htmlSetter: () => setText(FIELD_IDS.verifiedPhoneValue, derivePhoneForBanner())
    });
  } catch (e) { console.error("[uitest.js] renderPhoneVerification error", e); }
}

function renderProfileSection(state) {
  try {
    state.userProfile === false ? show(FORM_IDS.profileForm) : hide(FORM_IDS.profileForm);
    renderBanner({
      id: BANNER_IDS.profileStatusBanner,
      visible: !!state.userProfile,
      alertTypeClass: "alert-success",
      text: "Profile found in S3."
    });
  } catch (e) { console.error("[uitest.js] renderProfileSection error", e); }
}

function renderCookiesSection(state) {
  try {
    state.cookieAccepted === false ? show(FORM_IDS.cookieForm) : hide(FORM_IDS.cookieForm);
    renderBanner({
      id: BANNER_IDS.cookieBanner,
      visible: !!state.cookieAccepted,
      alertTypeClass: "alert-success",
      text: "Cookies accepted."
    });
  } catch (e) { console.error("[uitest.js] renderCookiesSection error", e); }
}

function renderTosSection(state) {
  try {
    state.tosAccepted === false ? show(FORM_IDS.tosForm) : hide(FORM_IDS.tosForm);
    renderBanner({
      id: BANNER_IDS.tosBanner,
      visible: !!state.tosAccepted,
      alertTypeClass: "alert-success",
      text: "Terms of Service accepted."
    });
  } catch (e) { console.error("[uitest.js] renderTosSection error", e); }
}
/* End UI rules */


/* Begin boolean flags + wrappers + dispatcher */

/** Builds boolean flags for which sections to evaluate. */
class DisplayFlags {
  /**
   * @param {object} state
   */
  constructor(state) {
    /** @type {boolean} */ this.showAccountAccess     = true;
    /** @type {boolean} */ this.showEmailVerification = true;
    /** @type {boolean} */ this.showPhoneVerification = (state.jwtPresent === true || state.phoneVerified === true) ? true : false;
    /** @type {boolean} */ this.showProfileSection    = true;
    /** @type {boolean} */ this.showCookiesSection    = true;
    /** @type {boolean} */ this.showTosSection        = true;
  }
}

// Thin wrappers: each receives a boolean and uses the cached state
function renderAccountAccessVisible(isOn)     { if (isOn) renderAccountAccess(CURRENT_RENDER_STATE); }
function renderEmailVerificationVisible(isOn) { if (isOn) renderEmailVerification(CURRENT_RENDER_STATE); }
function renderPhoneVerificationVisible(isOn) { if (isOn) renderPhoneVerification(CURRENT_RENDER_STATE); }
function renderProfileSectionVisible(isOn)    { if (isOn) renderProfileSection(CURRENT_RENDER_STATE); }
function renderCookiesSectionVisible(isOn)    { if (isOn) renderCookiesSection(CURRENT_RENDER_STATE); }
function renderTosSectionVisible(isOn)        { if (isOn) renderTosSection(CURRENT_RENDER_STATE); }

/** Single switch; only the last break. Each case passes a distinct boolean flag. */
function renderFormElements(flags) {
  try {
    switch (true) {
      case true:
        renderAccountAccessVisible(flags.showAccountAccess);
      case true:
        renderEmailVerificationVisible(flags.showEmailVerification);
      case true:
        renderPhoneVerificationVisible(flags.showPhoneVerification);
      case true:
        renderProfileSectionVisible(flags.showProfileSection);
      case true:
        renderCookiesSectionVisible(flags.showCookiesSection);
      case true:
        renderTosSectionVisible(flags.showTosSection);
        break; // last break only
    }
  } catch (e) {
    console.error("[uitest.js] renderFormElements error", e);
  }
}
/* End boolean flags + wrappers + dispatcher */


function renderAll(state) {
  CURRENT_RENDER_STATE = state;           // cache for wrappers
  const flags = new DisplayFlags(state);  // build explicit booleans
  renderFormElements(flags);              // dispatch with booleans
}


/* Begin wiring handlers */
function installControllerHandlers() {
  const controller = byId(FORM_IDS.controllerForm);
  controller?.addEventListener("submit", (e) => {
    e.preventDefault();
    try {
      const defaults = loadedDefaults || BUILT_IN_DEFAULTS;
      syncRadiosFromMap(defaults);
      CURRENT_RENDER_STATE = readAllToggles();
      renderAll(CURRENT_RENDER_STATE);
    } catch (err) {
      console.error("[uitest.js] Reset handler error", err);
    }
  });

  TOGGLE_NAMES.forEach((n) => {
    document.querySelectorAll(`input[name="${n}"]`).forEach((el) => {
      el.addEventListener("change", () => {
        try {
          CURRENT_RENDER_STATE = readAllToggles();
          renderAll(CURRENT_RENDER_STATE);
        } catch (err) {
          console.error("[uitest.js] Radio change error", err);
        }
      });
    });
  });
}

function installActionButtonHandlers() {
  byId(BUTTON_IDS.createProfile)?.addEventListener("click", () => {
    setRadioBoolean("userProfile", true);
    CURRENT_RENDER_STATE = readAllToggles();
    renderAll(CURRENT_RENDER_STATE);
  });
  byId(BUTTON_IDS.removeProfile)?.addEventListener("click", () => {
    setRadioBoolean("userProfile", false);
    CURRENT_RENDER_STATE = readAllToggles();
    renderAll(CURRENT_RENDER_STATE);
  });

  // Open modals are handled by consent.js; here we only handle resets:
  byId(BUTTON_IDS.resetCookies)?.addEventListener("click", () => {
    deleteCookieBridge("rg_cookie_accepted");
    if (typeof updateUIState === "function") { try { updateUIState(); } catch (e) { console.warn("[uitest.js] updateUIState failed", e); } }
    setRadioBoolean("cookieAccepted", false);
    CURRENT_RENDER_STATE = readAllToggles();
    renderAll(CURRENT_RENDER_STATE);
  });

  byId(BUTTON_IDS.resetTos)?.addEventListener("click", () => {
    deleteCookieBridge("rg_tos_version");
    if (typeof updateUIState === "function") { try { updateUIState(); } catch (e) { console.warn("[uitest.js] updateUIState failed", e); } }
    setRadioBoolean("tosAccepted", false);
    CURRENT_RENDER_STATE = readAllToggles();
    renderAll(CURRENT_RENDER_STATE);
  });
  
  // Accept buttons (from modals) — keep uitest radios in sync after consent.js sets cookies
  byId("acceptCookieBtn")?.addEventListener("click", () => {
    setRadioBoolean("cookieAccepted", true);
    CURRENT_RENDER_STATE = readAllToggles();
    renderAll(CURRENT_RENDER_STATE);
  });
  
  byId("acceptTosBtn")?.addEventListener("click", () => {
    setRadioBoolean("tosAccepted", true);
    CURRENT_RENDER_STATE = readAllToggles();
    renderAll(CURRENT_RENDER_STATE);
  });
  
}

function preventLiveFormSubmissions() {
  Object.values(FORM_IDS).forEach((id) => {
    if (id === FORM_IDS.controllerForm) return;
    const form = byId(id);
    form?.addEventListener("submit", (e) => { e.preventDefault(); });
  });
}
/* End wiring handlers */


/* Begin consent bridge */
function deleteCookieBridge(name) {
  // Mirror path and samesite; Expires set to past to delete
  document.cookie = `${encodeURIComponent(name)}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict`;
}

// Sync radios with real cookies set by consent.js
function syncRadiosFromConsentCookies() {
  try {
    const cookieOk = (typeof hasAcceptedCookies === "function") ? hasAcceptedCookies() : false;
    const tosOk = (typeof isTosCurrent === "function") ? isTosCurrent() : false;
    setRadioBoolean("cookieAccepted", !!cookieOk);
    setRadioBoolean("tosAccepted", !!tosOk);
  } catch (e) {
    console.warn("[uitest] Consent cookie sync skipped:", e);
  }
}
/* End consent bridge */


/* Begin initialization */
async function loadDefaultsJson() {
  try {
    const res = await fetch(DEFAULTS_JSON_PATH, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json && typeof json.toggleDefaults === "object") {
      return json.toggleDefaults;
    }
  } catch (e) {
    console.warn("[uitest.js] Unable to load uitest.json; using built-in defaults.", e);
  }
  return null;
}

async function init() {
  try {
    preventLiveFormSubmissions();
    installControllerHandlers();
    installActionButtonHandlers();

    loadedDefaults = await loadDefaultsJson();
    const defaults = loadedDefaults || BUILT_IN_DEFAULTS;
    syncRadiosFromMap(defaults);

    // Allow overrides via query params (e.g., ?loggedIn=true)
    TOGGLE_NAMES.forEach((n) => {
      const qp = getQueryParam(n);
      if (qp === "true" || qp === "false") setRadioBoolean(n, qp === "true");
    });

    // Reflect consent cookies (if consent.js present)
    syncRadiosFromConsentCookies();

    // First render from current radios
    CURRENT_RENDER_STATE = readAllToggles();
    renderAll(CURRENT_RENDER_STATE);
  } catch (e) {
    console.error("[uitest.js] init failed", e);
  }
}
document.addEventListener("DOMContentLoaded", init);
/* End initialization */

/* End uitest.js */
