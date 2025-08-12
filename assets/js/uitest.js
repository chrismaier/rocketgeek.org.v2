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
    acceptCookies: "btnAcceptCookies",
    rejectCookies: "btnRejectCookies",
    acceptTos: "btnAcceptTos",
    declineTos: "btnDeclineTos"
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
function byId(id) { const el = document.getElementById(id); if (!el) console.warn(`[uitest.js] Missing #${id}`); return el; }
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
    return sel ? sel.value === "true" : null;
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
    TOGGLE_NAMES.forEach(n => s[n] = readRadioBoolean(n));
    return s;
}
function syncRadiosFromMap(map) {
    TOGGLE_NAMES.forEach(n => { if (Object.prototype.hasOwnProperty.call(map, n)) setRadioBoolean(n, !!map[n]); });
}
/* End radio helpers */


/* Begin UI rules */
function deriveEmailForBanner() {
    return (
        byId(FIELD_IDS.emailConfirmEmailInput)?.value?.trim() ||
        byId(FIELD_IDS.loginEmailInput)?.value?.trim() ||
        byId(FIELD_IDS.emailLookupInput)?.value?.trim() ||
        ""
    );
}
function derivePhoneForBanner() {
    return byId(FIELD_IDS.phoneInput)?.value?.trim() || "";
}

/* Rule: false => show form, hide banner. true => hide form, show banner. */

function renderAccountAccess(t) {
    // Email lookup visibility driven by its toggle (not a true/false "validated" state)
    t.emailLookup === true ? show(FORM_IDS.emailLookupForm) : hide(FORM_IDS.emailLookupForm);
    
    // Logged in state uses the same rule
    t.loggedIn === false ? show(FORM_IDS.loginForm) : hide(FORM_IDS.loginForm);
    renderBanner({
        id: BANNER_IDS.loggedInBanner,
        visible: !!t.loggedIn,
        alertTypeClass: "alert-success",
        text: "Logged in successfully."
    });
}

function renderEmailVerification(t) {
    t.emailVerified === false ? show(FORM_IDS.emailConfirmForm) : hide(FORM_IDS.emailConfirmForm);
    renderBanner({
        id: BANNER_IDS.emailVerifiedBanner,
        visible: !!t.emailVerified,
        alertTypeClass: "alert-success",
        htmlSetter: () => setText(FIELD_IDS.verifiedEmailValue, deriveEmailForBanner())
    });
}

function renderPhoneVerification(t) {
    // Show phone confirm only when jwtPresent AND not verified; otherwise hide form.
    const showForm = t.jwtPresent === true && t.phoneVerified === false;
    showForm ? show(FORM_IDS.phoneConfirmForm) : hide(FORM_IDS.phoneConfirmForm);
    renderBanner({
        id: BANNER_IDS.phoneVerifiedBanner,
        visible: !!t.phoneVerified,
        alertTypeClass: "alert-success",
        htmlSetter: () => setText(FIELD_IDS.verifiedPhoneValue, derivePhoneForBanner())
    });
}

function renderProfileSection(t) {
    // false => show form, hide banner; true => hide form, show banner
    t.userProfile === false ? show(FORM_IDS.profileForm) : hide(FORM_IDS.profileForm);
    renderBanner({
        id: BANNER_IDS.profileStatusBanner,
        visible: !!t.userProfile,
        alertTypeClass: "alert-success",
        text: "Profile found in S3."
    });
}

function renderCookiesSection(t) {
    t.cookieAccepted === false ? show(FORM_IDS.cookieForm) : hide(FORM_IDS.cookieForm);
    renderBanner({
        id: BANNER_IDS.cookieBanner,
        visible: !!t.cookieAccepted,
        alertTypeClass: "alert-success",
        text: "Cookies accepted."
    });
}

function renderTosSection(t) {
    t.tosAccepted === false ? show(FORM_IDS.tosForm) : hide(FORM_IDS.tosForm);
    renderBanner({
        id: BANNER_IDS.tosBanner,
        visible: !!t.tosAccepted,
        alertTypeClass: "alert-success",
        text: "Terms of Service accepted."
    });
}

function renderAll(t) {
    console.group("[uitest.js] Render");
    console.log("State:", t);
    renderAccountAccess(t);
    renderEmailVerification(t);
    renderPhoneVerification(t);
    renderProfileSection(t);
    renderCookiesSection(t);
    renderTosSection(t);
    console.groupEnd();
}
/* End UI rules */


/* Begin wiring handlers */
function installControllerHandlers() {
    const controller = byId(FORM_IDS.controllerForm);
    controller?.addEventListener("submit", (e) => {
        e.preventDefault();
        const defaults = loadedDefaults || BUILT_IN_DEFAULTS;
        syncRadiosFromMap(defaults);
        renderAll(readAllToggles());
    });
    
    TOGGLE_NAMES.forEach((n) => {
        document.querySelectorAll(`input[name="${n}"]`).forEach((el) => {
            el.addEventListener("change", () => renderAll(readAllToggles()));
        });
    });
}

function installActionButtonHandlers() {
    byId(BUTTON_IDS.createProfile)?.addEventListener("click", () => { setRadioBoolean("userProfile", true);  renderAll(readAllToggles()); });
    byId(BUTTON_IDS.removeProfile)?.addEventListener("click", () => { setRadioBoolean("userProfile", false); renderAll(readAllToggles()); });
    
    byId(BUTTON_IDS.acceptCookies)?.addEventListener("click", () => { setRadioBoolean("cookieAccepted", true);  renderAll(readAllToggles()); });
    byId(BUTTON_IDS.rejectCookies)?.addEventListener("click", () => { setRadioBoolean("cookieAccepted", false); renderAll(readAllToggles()); });
    
    byId(BUTTON_IDS.acceptTos)?.addEventListener("click", () => { setRadioBoolean("tosAccepted", true);  renderAll(readAllToggles()); });
    byId(BUTTON_IDS.declineTos)?.addEventListener("click", () => { setRadioBoolean("tosAccepted", false); renderAll(readAllToggles()); });
}

function preventLiveFormSubmissions() {
    Object.values(FORM_IDS).forEach((id) => {
        if (id === FORM_IDS.controllerForm) return;
        const form = byId(id);
        form?.addEventListener("submit", (e) => {
            e.preventDefault();
            console.log(`[uitest.js] Prevented submit on #${id} (UI-only).`);
        });
    });
}
/* End wiring handlers */


/* Begin initialization */
async function loadDefaultsJson() {
    try {
        const res = await fetch(DEFAULTS_JSON_PATH, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json && typeof json.toggleDefaults === "object") {
            console.info("[uitest.js] Loaded toggle defaults from uitest.json");
            return json.toggleDefaults;
        }
    } catch (e) {
        console.warn("[uitest.js] Using built-in defaults.", e);
    }
    return null;
}

async function init() {
    console.info("[uitest.js] Initializing UI-only test page");
    
    preventLiveFormSubmissions();
    installControllerHandlers();
    installActionButtonHandlers();
    
    loadedDefaults = await loadDefaultsJson();
    const defaults = loadedDefaults || BUILT_IN_DEFAULTS;
    syncRadiosFromMap(defaults);
    
    // Optional overrides via query params (e.g., ?loggedIn=true)
    TOGGLE_NAMES.forEach((n) => {
        const qp = getQueryParam(n);
        if (qp === "true" || qp === "false") setRadioBoolean(n, qp === "true");
    });
    
    renderAll(readAllToggles());
    console.info("[uitest.js] Ready");
}

document.addEventListener("DOMContentLoaded", init);
/* End initialization */

/* End uitest.js */
