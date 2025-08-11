/* START: UI Test Page Script (uitest.js) */
/* Purpose: Drive UI-only scenarios on the confirm page markup with no API/Cognito dependencies. */

/* START: Constants and DOM lookups */
const UITEST_JSON_PATH = "assets/json-data/uitest.json";

const SECTION_IDS = {
    bannersWrapper: "verificationStatus",
    emailVerifiedBanner: "emailVerifiedBanner",
    phoneVerifiedBanner: "phoneVerifiedBanner",
    emailLookupForm: "emailLookupForm",
    loginForm: "loginForm",
    emailConfirmForm: "emailConfirmForm",
    phoneConfirmForm: "phoneConfirmForm"
};

const FIELD_IDS = {
    verifiedEmailValue: "verifiedEmailValue",
    verifiedPhoneValue: "verifiedPhoneValue",
    emailLookupInput: "email",
    loginEmailInput: "loginEmail",
    loginPasswordInput: "loginPassword",
    emailConfirmEmailInput: "emailConfirm",
    emailConfirmCodeInput: "emailCode",
    phoneInput: "phone",
    phoneCodeInput: "phoneCode"
};

const TOGGLE_NAMES = [
    "emailVerified",
    "phoneVerified",
    "loggedIn",
    "jwtPresent",
    "userProfile",
    "emailLookup"
];

let gConfig = null; // loaded from uitest.json or fallback
/* END: Constants and DOM lookups */

/* START: Utility functions */
function qs(id) {
    return document.getElementById(id);
}

function setVisible(elementId, shouldShow) {
    const el = qs(elementId);
    if (!el) {
        console.warn(`[uitest.js] Element not found: ${elementId}`);
        return;
    }
    el.style.display = shouldShow ? "" : "none";
    console.log(`[uitest.js] ${shouldShow ? "Showing" : "Hiding"} #${elementId}`);
}

function setText(elementId, text) {
    const el = qs(elementId);
    if (el) el.textContent = text ?? "";
}

function setValue(elementId, value) {
    const el = qs(elementId);
    if (el) el.value = value ?? "";
}

function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}
/* END: Utility functions */

/* START: Scenario application */
function applyBanners(banners) {
    const emailVerified = !!banners?.emailVerified;
    const phoneVerified = !!banners?.phoneVerified;
    
    setVisible(SECTION_IDS.bannersWrapper, emailVerified || phoneVerified);
    setVisible(SECTION_IDS.emailVerifiedBanner, emailVerified);
    setVisible(SECTION_IDS.phoneVerifiedBanner, phoneVerified);
    
    if (banners?.emailText) setText(FIELD_IDS.verifiedEmailValue, banners.emailText);
    if (banners?.phoneText) setText(FIELD_IDS.verifiedPhoneValue, banners.phoneText);
}

function applyFields(fields) {
    if (!fields) return;
    
    if (fields.emailLookup) setValue(FIELD_IDS.emailLookupInput, fields.emailLookup);
    if (fields.loginEmail) setValue(FIELD_IDS.loginEmailInput, fields.loginEmail);
    if (fields.loginPassword) setValue(FIELD_IDS.loginPasswordInput, fields.loginPassword);
    if (fields.emailConfirmEmail) setValue(FIELD_IDS.emailConfirmEmailInput, fields.emailConfirmEmail);
    if (fields.emailConfirmCode) setValue(FIELD_IDS.emailConfirmCodeInput, fields.emailConfirmCode);
    if (fields.phone) setValue(FIELD_IDS.phoneInput, fields.phone);
    if (fields.phoneCode) setValue(FIELD_IDS.phoneCodeInput, fields.phoneCode);
}

function applyVisibility(showList = [], hideList = []) {
    // First hide everything we manage except banners; banners are controlled by applyBanners
    [SECTION_IDS.emailLookupForm, SECTION_IDS.loginForm, SECTION_IDS.emailConfirmForm, SECTION_IDS.phoneConfirmForm].forEach((id) => {
        setVisible(id, false);
    });
    
    showList.forEach((id) => setVisible(id, true));
    hideList.forEach((id) => setVisible(id, false));
}

function applyScenarioByName(config, scenarioName) {
    const scenario = config?.scenarios?.[scenarioName];
    if (!scenario) {
        console.warn(`[uitest.js] Scenario not found: ${scenarioName}. Falling back to default.`);
        return applyScenarioByName(config, config?.defaultScenario);
    }
    
    console.group(`[uitest.js] Applying scenario: ${scenarioName}`);
    applyVisibility(scenario.show, scenario.hide);
    applyBanners(scenario.banners);
    applyFields(scenario.fields);
    if (config?.toggleDefaults) {
        syncToggles(config.toggleDefaults);
        updateUIFromToggles(); // ensure radios drive the same state after scenario sets base
    }
    console.groupEnd();
}
/* END: Scenario application */

/* START: UI Controller (radios) */
function getToggle(name) {
    const trueEl = document.querySelector(`input[name="${name}"][value="true"]`);
    const falseEl = document.querySelector(`input[name="${name}"][value="false"]`);
    if (!trueEl || !falseEl) return null;
    return trueEl.checked ? true : false;
}

function setToggle(name, value) {
    const v = !!value;
    const trueEl = document.querySelector(`input[name="${name}"][value="true"]`);
    const falseEl = document.querySelector(`input[name="${name}"][value="false"]`);
    if (trueEl && falseEl) {
        trueEl.checked = v;
        falseEl.checked = !v;
    }
}

function syncToggles(map) {
    TOGGLE_NAMES.forEach((n) => {
        if (Object.prototype.hasOwnProperty.call(map, n)) {
            setToggle(n, map[n]);
        }
    });
}

function readToggles() {
    const out = {};
    TOGGLE_NAMES.forEach((n) => (out[n] = getToggle(n)));
    return out;
}

function updateUIFromToggles() {
    const t = readToggles();
    console.group("[uitest.js] updateUIFromToggles");
    console.log("toggles:", t);
    
    // Banners
    applyBanners({
        emailVerified: t.emailVerified,
        phoneVerified: t.phoneVerified
    });
    
    // Visibility rules (simple + predictable)
    // - Email lookup form: directly tied to toggle
    setVisible(SECTION_IDS.emailLookupForm, !!t.emailLookup);
    
    // - Login form: visible when NOT logged in
    setVisible(SECTION_IDS.loginForm, t.loggedIn === false);
    
    // - Email confirm form: visible when email not verified and not using email lookup
    setVisible(SECTION_IDS.emailConfirmForm, t.emailVerified === false && t.emailLookup === false);
    
    // - Phone confirm form: visible when phone not verified AND JWT present
    setVisible(SECTION_IDS.phoneConfirmForm, t.phoneVerified === false && t.jwtPresent === true);
    
    // User Profile toggle is available for future UI sections; currently we just log it.
    if (t.userProfile) {
        console.log("[uitest.js] User Profile: TRUE (no bound UI section yet).");
    }
    
    console.groupEnd();
}

function installControllerHandlers() {
    // Prevent controller form submit except for Reset behavior we define
    const controllerForm = qs("uiControllerForm");
    controllerForm?.addEventListener("submit", (e) => {
        e.preventDefault();
        // Reset to defaults from config, if present; else fallback defaults
        const defaults = gConfig?.toggleDefaults || {
            emailVerified: false,
            phoneVerified: false,
            loggedIn: false,
            jwtPresent: false,
            userProfile: false,
            emailLookup: true
        };
        console.info("[uitest.js] Resetting toggles to defaults:", defaults);
        syncToggles(defaults);
        updateUIFromToggles();
    });
    
    // Any change to radios updates UI immediately
    TOGGLE_NAMES.forEach((n) => {
        document.querySelectorAll(`input[name="${n}"]`).forEach((el) => {
            el.addEventListener("change", updateUIFromToggles);
        });
    });
}
/* END: UI Controller (radios) */

/* START: Hotkeys */
function installHotkeys(config) {
    const scenarioNames = Object.keys(config.scenarios || {});
    let index = Math.max(0, scenarioNames.indexOf(config.defaultScenario));
    
    document.addEventListener("keydown", (evt) => {
        if (evt.key === "]" && scenarioNames.length) {
            index = (index + 1) % scenarioNames.length;
            applyScenarioByName(config, scenarioNames[index]);
        }
        if (evt.key === "[" && scenarioNames.length) {
            index = (index - 1 + scenarioNames.length) % scenarioNames.length;
            applyScenarioByName(config, scenarioNames[index]);
        }
        if (evt.key === "?") {
            console.info(`[uitest.js] Scenarios: ${scenarioNames.join(", ")}`);
        }
    });
    
    console.info("[uitest.js] Hotkeys: '[' previous, ']' next, '?' list scenarios");
}
/* END: Hotkeys */

/* START: Initialization */
async function init() {
    console.info("[uitest.js] Initializing UI test page (UI-only).");
    
    // Prevent built-in forms from submitting
    ["emailLookupForm", "loginForm", "emailConfirmForm", "phoneConfirmForm"].forEach((formId) => {
        const formEl = qs(formId);
        if (formEl) {
            formEl.addEventListener("submit", (e) => {
                e.preventDefault();
                console.log(`[uitest.js] Prevented submit on #${formId} (UI-only mode).`);
            });
        }
    });
    
    installControllerHandlers();
    
    try {
        const res = await fetch(UITEST_JSON_PATH, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        gConfig = await res.json();
        console.info("[uitest.js] Loaded uitest.json");
    } catch (err) {
        console.error("[uitest.js] Failed to load uitest.json. Using built-in defaults.", err);
        gConfig = {
            defaultScenario: "no_jwt",
            toggleDefaults: {
                emailVerified: false,
                phoneVerified: false,
                loggedIn: false,
                jwtPresent: false,
                userProfile: false,
                emailLookup: true
            },
            scenarios: {
                no_jwt: {
                    show: [SECTION_IDS.emailLookupForm, SECTION_IDS.loginForm],
                    hide: [SECTION_IDS.emailConfirmForm, SECTION_IDS.phoneConfirmForm],
                    banners: { emailVerified: false, phoneVerified: false }
                },
                needs_email_confirm: {
                    show: [SECTION_IDS.emailConfirmForm],
                    hide: [SECTION_IDS.emailLookupForm, SECTION_IDS.loginForm, SECTION_IDS.phoneConfirmForm],
                    banners: { emailVerified: false, phoneVerified: false },
                    fields: { emailConfirmEmail: "user@example.com" }
                },
                needs_phone_confirm: {
                    show: [SECTION_IDS.phoneConfirmForm],
                    hide: [SECTION_IDS.emailLookupForm, SECTION_IDS.loginForm, SECTION_IDS.emailConfirmForm],
                    banners: { emailVerified: true, phoneVerified: false, emailText: "user@example.com" },
                    fields: { phone: "+1 555 123 4567" }
                },
                fully_verified: {
                    show: [],
                    hide: [SECTION_IDS.emailLookupForm, SECTION_IDS.loginForm, SECTION_IDS.emailConfirmForm, SECTION_IDS.phoneConfirmForm],
                    banners: { emailVerified: true, phoneVerified: true, emailText: "user@example.com", phoneText: "+1 555 123 4567" }
                }
            }
        };
    }
    
    // Apply initial scenario, then set toggles to defaults and render
    const scenarioFromQuery = getQueryParam("scenario");
    const initialScenario = scenarioFromQuery || gConfig.defaultScenario;
    applyScenarioByName(gConfig, initialScenario);
    
    const defaults = gConfig.toggleDefaults || {
        emailVerified: false,
        phoneVerified: false,
        loggedIn: false,
        jwtPresent: false,
        userProfile: false,
        emailLookup: true
    };
    syncToggles(defaults);
    updateUIFromToggles();
    
    installHotkeys(gConfig);
    
    console.info("[uitest.js] Ready. Use URL param ?scenario=needs_email_confirm, '['/']' to cycle, or radios to toggle.");
}

document.addEventListener("DOMContentLoaded", init);
/* END: Initialization */

/* END: UI Test Page Script (uitest.js) */
