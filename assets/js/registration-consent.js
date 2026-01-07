/* START: configuration */
const RG_COOKIE_ACCEPTED = "rg_cookie_accepted";
const RG_SMS_ACCEPTED = "rg_sms_accepted";
const RG_TOS_VERSION = "rg_tos_version";

// Terms-of-Service version source of truth is /terms-of-service.html (#rgTosVersionSource)
// Default to 0.0.0 if page is not parseable
let RG_REQUIRED_TOS_VERSION = "0.0.0";

// Default persistence window in days
const DEFAULT_PERSISTENCE_DAYS = 365;
/* STOP: configuration */

/* START: cookie utilities */
function setPersistentCookie(name, value, days = DEFAULT_PERSISTENCE_DAYS) {
    const now = new Date();
    now.setTime(now.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = now.toUTCString();
    const cookie = [
        `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
        "Path=/",
        "Secure",
        "SameSite=Strict",
        `Expires=${expires}`,
        `Max-Age=${days * 24 * 60 * 60}`
    ].join("; ");
    document.cookie = cookie;
    setLocalConsent(name, value);
    console.info(`[consent] Set cookie: ${name}=<redacted>; Expires=${expires}`);
}

function getCookie(name) {
    const cookieName = encodeURIComponent(name);
    const target = `${cookieName}=`;
    const parts = document.cookie.split(";").map(s => s.trim());
    for (const part of parts) {
        if (part.startsWith(target)) {
            return decodeURIComponent(part.substring(target.length));
        }
    }
    try { return localStorage.getItem(cookieName); } catch (error) { return null; }
}


function hasAcceptedCookies() {
    return getCookie(RG_COOKIE_ACCEPTED) === "true";
}

function hasAcceptedSmsPolicy() {
    return getCookie(RG_SMS_ACCEPTED) === "true";
}

function getAcceptedTosVersion() {
    return getCookie(RG_TOS_VERSION);
}

function getRequiredTosVersion() {
    return RG_REQUIRED_TOS_VERSION || "0.0.0";
}

function isTosCurrent() {
    const requiredTosVersion = getRequiredTosVersion();
    if (!requiredTosVersion || requiredTosVersion === "0.0.0") return false;
    return getAcceptedTosVersion() === requiredTosVersion;
}

function setLocalConsent(name, value) { try { localStorage.setItem(name, value); } catch (error) {} }
function getLocalConsent(name) { try { return localStorage.getItem(name); } catch (error) { return null; } }

/* STOP: cookie utilities */

/* START: Terms version source of truth (read from /terms-of-service.html body marker) */
async function initializeRequiredTosVersion() {
    const fetchedTosVersion = await fetchTosVersionFromTermsPage();
    if (!fetchedTosVersion) {
        console.warn("[consent] Could not determine required ToS version from /terms-of-service.html; defaulting to 0.0.0");
        RG_REQUIRED_TOS_VERSION = "0.0.0";
        return;
    }
    
    RG_REQUIRED_TOS_VERSION = fetchedTosVersion;
    console.info("[consent] Required ToS version loaded from Terms page:", RG_REQUIRED_TOS_VERSION);
}

async function fetchTosVersionFromTermsPage() {
    try {
        const response = await fetch("/terms-of-service.html", { cache: "no-store" });
        if (!response.ok) {
            console.warn("[consent] Failed to fetch /terms-of-service.html:", response.status);
            return null;
        }
        
        const htmlText = await response.text();
        const parser = new DOMParser();
        const termsDocument = parser.parseFromString(htmlText, "text/html");
        
        const versionElement = termsDocument.getElementById("rgTosVersionSource");
        if (!versionElement) {
            console.warn("[consent] #rgTosVersionSource not found in /terms-of-service.html");
            return null;
        }
        
        const dataVersion = (versionElement.getAttribute("data-tos-version") || "").trim();
        if (dataVersion.length > 0) {
            return dataVersion;
        }
        
        const textVersion = (versionElement.textContent || "").trim();
        if (textVersion.length > 0) {
            return textVersion.replace(/^v/i, "").trim();
        }
        
        console.warn("[consent] #rgTosVersionSource found, but no version value present");
        return null;
    } catch (error) {
        console.error("[consent] Error fetching/parsing /terms-of-service.html:", error);
        return null;
    }
}
/* STOP: Terms version source of truth (read from /terms-of-service.html body marker) */

/* Begin form readiness helpers */
function getTrimmedInputValueById(elementId) {
    const element = document.getElementById(elementId);
    const rawValue = element ? element.value : "";
    return (rawValue || "").trim();
}

function isRegistrationFormCompleteEnoughToEnableSubmit() {
    // Only "required field presence" + password match here.
    // Deeper validation remains in register.js (Cognito errors, formatting, etc.)
    const firstName = getTrimmedInputValueById("firstName");
    const lastName = getTrimmedInputValueById("lastName");
    const email = getTrimmedInputValueById("email");
    const phoneNumber = getTrimmedInputValueById("phoneNumber");
    const zipCode = getTrimmedInputValueById("zipCode");
    
    const password = (document.getElementById("passwordInput")?.value || "");
    const repeatPassword = (document.getElementById("repeatPasswordInput")?.value || "");
    
    const allRequiredPresent =
        firstName.length > 0 &&
        lastName.length > 0 &&
        email.length > 0 &&
        phoneNumber.length > 0 &&
        zipCode.length > 0 &&
        password.length > 0 &&
        repeatPassword.length > 0;
    
    if (!allRequiredPresent) return false;
    if (password !== repeatPassword) return false;
    
    return true;
}

function wireFormFieldEventsToRefreshButtonState() {
    const fieldIdsToWatch = [
        "firstName",
        "lastName",
        "email",
        "phoneNumber",
        "zipCode",
        "passwordInput",
        "repeatPasswordInput"
    ];
    
    for (const fieldId of fieldIdsToWatch) {
        const fieldElement = document.getElementById(fieldId);
        if (!fieldElement) continue;
        
        fieldElement.addEventListener("input", () => {
            updateUIState();
        });
        fieldElement.addEventListener("change", () => {
            updateUIState();
        });
    }
}
/* End form readiness helpers */

/* START: ui helpers */
function setDisabled(el, disabled) {
    if (!el) return;
    el.disabled = !!disabled;
}

function setButtonTextState(buttonElement, state) {
    if (!buttonElement) return;
    
    buttonElement.classList.remove("text-success", "text-warning", "text-muted");
    
    if (state === "accepted") {
        buttonElement.classList.add("text-success");
        return;
    }
    
    if (state === "outdated") {
        buttonElement.classList.add("text-warning");
        return;
    }
    
    // state === "none": keep default
}

function updateStatusText() {
    const status = document.getElementById("consentStatusText");
    if (!status) return;
    
    const cookieAccepted = hasAcceptedCookies();
    const smsAccepted = hasAcceptedSmsPolicy();
    const acceptedTosVersion = getAcceptedTosVersion();
    const requiredTosVersion = getRequiredTosVersion();
    const tosCurrent = isTosCurrent();
    const formComplete = isRegistrationFormCompleteEnoughToEnableSubmit();
    
    if (!cookieAccepted) {
        status.textContent = "Step 1: Accept cookie policy to continue.";
        return;
    }
    if (!smsAccepted) {
        status.textContent = "Step 2: Review and accept the SMS policy to continue.";
        return;
    }
    
    if (requiredTosVersion === "0.0.0") {
        status.textContent = "Step 3: Terms version unavailable (v0.0.0). Please refresh and try again.";
        return;
    }
    
    if (!acceptedTosVersion) {
        status.textContent = "Step 3: Review and accept the Terms of Service to continue.";
        return;
    }
    if (!tosCurrent) {
        status.textContent = `Your accepted Terms (${acceptedTosVersion}) is out of date. Please accept v${requiredTosVersion}.`;
        return;
    }
    if (!formComplete) {
        status.textContent = "Final step: Complete all required fields to enable the Register Account button.";
        return;
    }
    
    status.textContent = "All set: You may register now.";
}

function setReadonlyCheckboxState(checkboxElement, isChecked, isIndeterminate) {
    if (!checkboxElement) return;
    
    checkboxElement.checked = !!isChecked;
    checkboxElement.indeterminate = !!isIndeterminate;
}


function updateUIState() {
    const registerBtn = document.getElementById("registerBtn");
    const openCookieBtn = document.getElementById("openCookieBtn");
    const openSmsBtn = document.getElementById("openSmsBtn");
    const openTosBtn = document.getElementById("openTosBtn");
    const smsDisclaimerCheckbox = document.getElementById("smsDisclaimer");
    const cookieDisclaimerCheckbox = document.getElementById("cookieDisclaimer");
    const tosDisclaimerCheckbox = document.getElementById("tosDisclaimer");
    
    
    const cookieAccepted = hasAcceptedCookies();
    const smsAccepted = hasAcceptedSmsPolicy();
    const requiredTosVersion = getRequiredTosVersion();
    const acceptedTosVersion = getAcceptedTosVersion();
    const tosCurrent = isTosCurrent();
    const formComplete = isRegistrationFormCompleteEnoughToEnableSubmit();
    
    setDisabled(openCookieBtn, false);
    setDisabled(openSmsBtn, !cookieAccepted);                   // SMS only after cookies accepted
    
    // SMS and Cookie: checked only when accepted
    setReadonlyCheckboxState(cookieDisclaimerCheckbox, cookieAccepted, false);
    setReadonlyCheckboxState(smsDisclaimerCheckbox, smsAccepted, false);

    // ToS: checked only when current (matches your gating)
    setReadonlyCheckboxState(tosDisclaimerCheckbox, tosCurrent, false);
    
    // ToS only after cookies + SMS accepted, AND only if we have a parseable terms version (not 0.0.0)
    const canOpenTos = cookieAccepted && smsAccepted && requiredTosVersion !== "0.0.0";
    setDisabled(openTosBtn, !canOpenTos);
    
    // Register only when everything is satisfied
    setDisabled(registerBtn, !(cookieAccepted && smsAccepted && tosCurrent && formComplete));
    
    // Button text state
    setButtonTextState(openCookieBtn, cookieAccepted ? "accepted" : "none");
    setButtonTextState(openSmsBtn, smsAccepted ? "accepted" : "none");
    
    if (!acceptedTosVersion) {
        setButtonTextState(openTosBtn, "none");
    } else if (tosCurrent) {
        setButtonTextState(openTosBtn, "accepted");
    } else {
        setButtonTextState(openTosBtn, "outdated");
    }
    
    console.debug("[consent] UI updated", {
        cookieAccepted,
        smsAccepted,
        formComplete,
        acceptedTosVersion,
        requiredTosVersion,
        tosCurrent
    });
    
    updateStatusText();
}

function showCurrentTosVersionInModal() {
    const slot = document.getElementById("tosVersionDisplay");
    if (slot) {
        slot.textContent = `v${getRequiredTosVersion()}`;
    }
}
/* STOP: ui helpers */

/* START: event wiring */
function wireConsentEvents() {
    const openCookieBtn = document.getElementById("openCookieBtn");
    const openSmsBtn = document.getElementById("openSmsBtn");
    const openTosBtn = document.getElementById("openTosBtn");
    
    const acceptCookieBtn = document.getElementById("acceptCookieBtn");
    const acceptSmsBtn = document.getElementById("acceptSmsBtn");
    const acceptTosBtn = document.getElementById("acceptTosBtn");
    
    const cookiePolicyModalEl = document.getElementById("cookiePolicyModal");
    const smsPolicyModalEl = document.getElementById("smsPolicyModal");
    const tosModalEl = document.getElementById("tosModal");
    
    const cookiePolicyModal = cookiePolicyModalEl ? new bootstrap.Modal(cookiePolicyModalEl) : null;
    const smsPolicyModal = smsPolicyModalEl ? new bootstrap.Modal(smsPolicyModalEl) : null;
    const tosModal = tosModalEl ? new bootstrap.Modal(tosModalEl) : null;
    
    if (openCookieBtn && cookiePolicyModal) {
        openCookieBtn.addEventListener("click", () => {
            console.log("[consent] Opening Cookie Policy modal");
            cookiePolicyModal.show();
        });
    }
    
    if (openSmsBtn && smsPolicyModal) {
        openSmsBtn.addEventListener("click", () => {
            console.log("[consent] Opening SMS Policy modal");
            smsPolicyModal.show();
        });
    }
    
    if (openTosBtn && tosModal) {
        openTosBtn.addEventListener("click", () => {
            console.log("[consent] Opening ToS modal");
            showCurrentTosVersionInModal();
            tosModal.show();
        });
    }
    
    if (acceptCookieBtn && cookiePolicyModal) {
        acceptCookieBtn.addEventListener("click", () => {
            console.log("[consent] Cookie policy accepted (persistent)");
            setPersistentCookie(RG_COOKIE_ACCEPTED, "true");
            cookiePolicyModal.hide();
            updateUIState();
        });
    }
    
    if (acceptSmsBtn && smsPolicyModal) {
        acceptSmsBtn.addEventListener("click", () => {
            console.log("[consent] SMS policy accepted (persistent)");
            setPersistentCookie(RG_SMS_ACCEPTED, "true");
            smsPolicyModal.hide();
            updateUIState();
        });
    }
    
    if (acceptTosBtn && tosModal) {
        acceptTosBtn.addEventListener("click", () => {
            const requiredTosVersion = getRequiredTosVersion();
            console.log(`[consent] ToS accepted (persistent) v${requiredTosVersion}`);
            setPersistentCookie(RG_TOS_VERSION, requiredTosVersion);
            tosModal.hide();
            updateUIState();
        });
    }
    
    
    
    // Prevent submit unless all conditions met (kept for compatibility; register.js is the primary submit gate)
    const form = document.getElementById("registrationConsentForm");
    const registerBtn = document.getElementById("registerBtn");
    if (form && registerBtn) {
        form.addEventListener("submit", (evt) => {
            const canSubmit =
                hasAcceptedCookies() &&
                hasAcceptedSmsPolicy() &&
                isTosCurrent() &&
                isRegistrationFormCompleteEnoughToEnableSubmit();
            
            if (!canSubmit) {
                console.warn("[consent] Submission blocked: requirements not met");
                evt.preventDefault();
                evt.stopPropagation();
                updateUIState();
            } else {
                console.log("[consent] Submission allowed");
            }
        });
    }
}
/* STOP: event wiring */

/* START: bootstrap */
document.addEventListener("DOMContentLoaded", () => {
    console.info("[consent] Init");
    
    // Keep button state responsive to typing
    wireFormFieldEventsToRefreshButtonState();
    
    // Load required ToS version from /terms-of-service.html, then refresh UI
    initializeRequiredTosVersion()
        .then(() => {
            updateUIState();
        })
        .catch((error) => {
            console.error("[consent] ToS version initialization failed:", error);
            RG_REQUIRED_TOS_VERSION = "0.0.0";
            updateUIState();
        });
    
    wireConsentEvents();
});
/* STOP: bootstrap */
