/* Begin uitest.js - UI-only controller for uitest.html */

/* Begin constants */
const DEFAULTS_JSON_PATH = "assets/json-data/uitest.json";

/* Section and control element IDs kept descriptive and explicit */
const SECTION_IDS = {
    accountAccess: "sectionAccountAccess",
    emailVerification: "sectionEmailVerification",
    phoneVerification: "sectionPhoneVerification",
    profile: "sectionProfile",
    cookies: "sectionCookies",
    tos: "sectionToS"
};

const FORM_IDS = {
    emailLookupForm: "emailLookupForm",
    loginForm: "loginForm",
    emailConfirmForm: "emailConfirmForm",
    phoneConfirmForm: "phoneConfirmForm",
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

/* Radios in the controller form */
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

/* Defaults if no JSON present */
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
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`[uitest.js] Missing element with id: ${id}`);
    }
    return element;
}

function show(id) {
    const element = byId(id);
    if (!element) return;
    element.style.display = "";
    console.log(`[uitest.js] Show #${id}`);
}

function hide(id) {
    const element = byId(id);
    if (!element) return;
    element.style.display = "none";
    console.log(`[uitest.js] Hide #${id}`);
}

function setText(id, text) {
    const element = byId(id);
    if (!element) return;
    element.textContent = text ?? "";
}

function setInputValue(id, value) {
    const element = byId(id);
    if (!element) return;
    element.value = value ?? "";
}

function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

/* Remove any prior Bootstrap alert-* classes and apply the requested one */
function setBannerClass(element, alertTypeClass) {
    if (!element) return;
    element.classList.forEach((cls) => {
        if (cls.startsWith("alert-")) {
            element.classList.remove(cls);
        }
    });
    if (!element.classList.contains("alert")) {
        element.classList.add("alert");
    }
    if (alertTypeClass) {
        element.classList.add(alertTypeClass);
    }
}

/* Convenience to update a banner */
function renderBanner({ id, visible, alertTypeClass, text, htmlSetter }) {
    const bannerElement = byId(id);
    if (!bannerElement) return;
    
    if (visible) {
        setBannerClass(bannerElement, alertTypeClass || "alert-success");
        if (typeof htmlSetter === "function") {
            htmlSetter(bannerElement);
        } else if (typeof text === "string") {
            bannerElement.textContent = text;
        }
        show(id);
    } else {
        hide(id);
    }
}
/* End DOM helpers */


/* Begin radio helpers */
function readRadioBoolean(groupName) {
    const selected = document.querySelector(`input[name="${groupName}"]:checked`);
    if (!selected) return null;
    return selected.value === "true";
}

function setRadioBoolean(groupName, value) {
    const desired = value ? "true" : "false";
    const target = document.querySelector(`input[name="${groupName}"][value="${desired}"]`);
    const opposite = document.querySelector(
        `input[name="${groupName}"][value="${value ? "false" : "true"}"]`
    );
    if (target) target.checked = true;
    if (opposite) opposite.checked = false;
}

function readAllToggles() {
    const state = {};
    TOGGLE_NAMES.forEach((name) => {
        state[name] = readRadioBoolean(name);
    });
    return state;
}

function syncRadiosFromMap(map) {
    TOGGLE_NAMES.forEach((name) => {
        if (Object.prototype.hasOwnProperty.call(map, name)) {
            setRadioBoolean(name, !!map[name]);
        }
    });
}
/* End radio helpers */


/* Begin UI rules */
function deriveEmailForBanner() {
    // Preference order: emailConfirm input, loginEmail, email lookup box
    const emailConfirm = byId(FIELD_IDS.emailConfirmEmailInput)?.value?.trim();
    if (emailConfirm) return emailConfirm;
    
    const loginEmail = byId(FIELD_IDS.loginEmailInput)?.value?.trim();
    if (loginEmail) return loginEmail;
    
    const lookupEmail = byId(FIELD_IDS.emailLookupInput)?.value?.trim();
    if (lookupEmail) return lookupEmail;
    
    return "";
}

function derivePhoneForBanner() {
    const phone = byId(FIELD_IDS.phoneInput)?.value?.trim();
    return phone || "";
}

function renderAccountAccess(toggles) {
    // Email lookup visibility follows its toggle
    if (toggles.emailLookup === true) {
        show(FORM_IDS.emailLookupForm);
    } else {
        hide(FORM_IDS.emailLookupForm);
    }
    
    // Login form is visible when NOT logged in
    if (toggles.loggedIn === false) {
        show(FORM_IDS.loginForm);
    } else {
        hide(FORM_IDS.loginForm);
    }
    
    // Logged-in success banner reflects loggedIn state
    renderBanner({
        id: BANNER_IDS.loggedInBanner,
        visible: !!toggles.loggedIn,
        alertTypeClass: "alert-success",
        text: "Logged in successfully."
    });
}

function renderEmailVerification(toggles) {
    // Email confirm form shows when NOT verified
    if (toggles.emailVerified === false) {
        show(FORM_IDS.emailConfirmForm);
    } else {
        hide(FORM_IDS.emailConfirmForm);
    }
    
    // Email verified banner shows when verified
    renderBanner({
        id: BANNER_IDS.emailVerifiedBanner,
        visible: !!toggles.emailVerified,
        alertTypeClass: "alert-success",
        htmlSetter: () => {
            setText(FIELD_IDS.verifiedEmailValue, deriveEmailForBanner());
        }
    });
}

function renderPhoneVerification(toggles) {
    // Phone confirm form shows only when JWT present AND not verified
    const shouldShowPhoneForm = toggles.jwtPresent === true && toggles.phoneVerified === false;
    if (shouldShowPhoneForm) {
        show(FORM_IDS.phoneConfirmForm);
    } else {
        hide(FORM_IDS.phoneConfirmForm);
    }
    
    // Phone verified banner shows when verified
    renderBanner({
        id: BANNER_IDS.phoneVerifiedBanner,
        visible: !!toggles.phoneVerified,
        alertTypeClass: "alert-success",
        htmlSetter: () => {
            setText(FIELD_IDS.verifiedPhoneValue, derivePhoneForBanner());
        }
    });
}

function renderProfileSection(toggles) {
    // Simple status indicator for now
    if (toggles.userProfile === true) {
        renderBanner({
            id: BANNER_IDS.profileStatusBanner,
            visible: true,
            alertTypeClass: "alert-info",
            text: "Profile found in S3."
        });
    } else {
        renderBanner({
            id: BANNER_IDS.profileStatusBanner,
            visible: true,
            alertTypeClass: "alert-warning",
            text: "No profile found in S3."
        });
    }
}

function renderCookieBanner(toggles) {
    if (toggles.cookieAccepted === true) {
        renderBanner({
            id: BANNER_IDS.cookieBanner,
            visible: true,
            alertTypeClass: "alert-success",
            text: "Cookies accepted."
        });
    } else {
        renderBanner({
            id: BANNER_IDS.cookieBanner,
            visible: true,
            alertTypeClass: "alert-warning",
            text: "Please accept cookies to continue."
        });
    }
}

function renderTosBanner(toggles) {
    if (toggles.tosAccepted === true) {
        renderBanner({
            id: BANNER_IDS.tosBanner,
            visible: true,
            alertTypeClass: "alert-success",
            text: "Terms of Service accepted."
        });
    } else {
        renderBanner({
            id: BANNER_IDS.tosBanner,
            visible: true,
            alertTypeClass: "alert-danger",
            text: "You must accept the Terms of Service."
        });
    }
}

function renderAll(toggles) {
    console.group("[uitest.js] Render cycle");
    console.log("State:", toggles);
    
    renderAccountAccess(toggles);
    renderEmailVerification(toggles);
    renderPhoneVerification(toggles);
    renderProfileSection(toggles);
    renderCookieBanner(toggles);
    renderTosBanner(toggles);
    
    console.groupEnd();
}
/* End UI rules */


/* Begin wiring handlers */
function installControllerHandlers() {
    const controllerFormElement = byId(FORM_IDS.controllerForm);
    if (controllerFormElement) {
        controllerFormElement.addEventListener("submit", (event) => {
            event.preventDefault();
            const defaults = loadedDefaults || BUILT_IN_DEFAULTS;
            console.info("[uitest.js] Resetting to defaults:", defaults);
            syncRadiosFromMap(defaults);
            renderAll(readAllToggles());
        });
    }
    
    // Instant re-render on any radio change
    TOGGLE_NAMES.forEach((name) => {
        document.querySelectorAll(`input[name="${name}"]`).forEach((inputElement) => {
            inputElement.addEventListener("change", () => {
                renderAll(readAllToggles());
            });
        });
    });
}

function preventLiveFormSubmissions() {
    Object.values(FORM_IDS).forEach((formId) => {
        const formElement = byId(formId);
        if (!formElement) return;
        
        // Skip the controller form here; it has its own handler above
        if (formId === FORM_IDS.controllerForm) return;
        
        formElement.addEventListener("submit", (event) => {
            event.preventDefault();
            console.log(`[uitest.js] Prevented submit on #${formId} (UI-only).`);
        });
    });
}
/* End wiring handlers */


/* Begin initialization */
async function loadDefaultsJson() {
    try {
        const response = await fetch(DEFAULTS_JSON_PATH, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        if (json && typeof json.toggleDefaults === "object") {
            console.info("[uitest.js] Loaded toggle defaults from uitest.json");
            return json.toggleDefaults;
        }
    } catch (error) {
        console.warn("[uitest.js] No uitest.json defaults found; using built-in defaults.", error);
    }
    return null;
}

async function init() {
    console.info("[uitest.js] Initializing UI-only test page");
    
    preventLiveFormSubmissions();
    installControllerHandlers();
    
    loadedDefaults = await loadDefaultsJson();
    const defaults = loadedDefaults || BUILT_IN_DEFAULTS;
    
    // Apply defaults to radios and render
    syncRadiosFromMap(defaults);
    
    // Optional: allow quick one-off overrides via query params like ?loggedIn=true
    TOGGLE_NAMES.forEach((name) => {
        const qp = getQueryParam(name);
        if (qp === "true" || qp === "false") {
            setRadioBoolean(name, qp === "true");
        }
    });
    
    renderAll(readAllToggles());
    
    console.info("[uitest.js] Ready");
}

document.addEventListener("DOMContentLoaded", init);
/* End initialization */

/* End uitest.js */
