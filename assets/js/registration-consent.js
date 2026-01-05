/* START: configuration */
const RG_COOKIE_ACCEPTED = "rg_cookie_accepted";
const RG_SMS_ACCEPTED = "rg_sms_accepted";
const RG_TOS_VERSION = "rg_tos_version";

// Update this whenever your Terms change
const CURRENT_TOS_VERSION = "1.0.0";

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
    console.info(`[consent] Set cookie: ${name}=<redacted>; Expires=${expires}`);
}

function getCookie(name) {
    const target = `${encodeURIComponent(name)}=`;
    const parts = document.cookie.split(";").map(s => s.trim());
    for (const part of parts) {
        if (part.startsWith(target)) {
            return decodeURIComponent(part.substring(target.length));
        }
    }
    return null;
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

function isTosCurrent() {
    return getAcceptedTosVersion() === CURRENT_TOS_VERSION;
}
/* STOP: cookie utilities */

/* START: ui helpers */
function setDisabled(el, disabled) {
    if (!el) return;
    el.disabled = !!disabled;
}

function updateStatusText() {
    const status = document.getElementById("consentStatusText");
    if (!status) return;
    
    const cookieAccepted = hasAcceptedCookies();
    const smsAccepted = hasAcceptedSmsPolicy();
    const tosVersion = getAcceptedTosVersion();
    const tosCurrent = isTosCurrent();
    
    if (!cookieAccepted) {
        status.textContent = "Step 1: Accept cookie policy to continue.";
        return;
    }
    if (!smsAccepted) {
        status.textContent = "Step 2: Review and accept the SMS policy.";
        return;
    }
    if (!tosVersion) {
        status.textContent = "Step 3: Review and accept the Terms of Service.";
        return;
    }
    if (!tosCurrent) {
        status.textContent = `Your accepted Terms (${tosVersion}) is out of date. Please accept v${CURRENT_TOS_VERSION}.`;
        return;
    }
    status.textContent = "All set: You may register now.";
}

function setButtonAcceptedTextColor(buttonElement, isAccepted) {
    if (!buttonElement) return;
    
    if (isAccepted) {
        buttonElement.classList.add("text-success");
        buttonElement.classList.remove("text-muted");
    } else {
        buttonElement.classList.remove("text-success");
    }
}

function setButtonTextState(buttonElement, state) {
    if (!buttonElement) return;
    
    // Clean slate
    buttonElement.classList.remove("text-success", "text-warning", "text-muted");
    
    if (state === "accepted") {
        buttonElement.classList.add("text-success");
        return;
    }
    
    if (state === "outdated") {
        buttonElement.classList.add("text-warning");
        return;
    }
    
    // state === "none" (or anything else): leave default button text color
}



function updateUIState() {
    const registerBtn = document.getElementById("registerBtn");
    const openCookieBtn = document.getElementById("openCookieBtn");
    const openSmsBtn = document.getElementById("openSmsBtn");
    const openTosBtn = document.getElementById("openTosBtn");
    
    const cookieAccepted = hasAcceptedCookies();
    const smsAccepted = hasAcceptedSmsPolicy();
    const tosCurrent = isTosCurrent();
    
    setDisabled(openCookieBtn, false);
    setDisabled(openSmsBtn, !cookieAccepted);                 // SMS only after cookies accepted
    setDisabled(openTosBtn, !(cookieAccepted && smsAccepted)); // ToS only after cookies + SMS accepted
    setDisabled(registerBtn, !(cookieAccepted && smsAccepted && tosCurrent));
    
    setButtonAcceptedTextColor(openCookieBtn, cookieAccepted);
    setButtonAcceptedTextColor(openSmsBtn, smsAccepted);
    setButtonAcceptedTextColor(openTosBtn, tosCurrent);
    
    setButtonTextState(openCookieBtn, cookieAccepted ? "accepted" : "none");
    setButtonTextState(openSmsBtn, smsAccepted ? "accepted" : "none");
    
    if (!getAcceptedTosVersion()) {
        setButtonTextState(openTosBtn, "none");
    } else if (tosCurrent) {
        setButtonTextState(openTosBtn, "accepted");
    } else {
        setButtonTextState(openTosBtn, "outdated");
    }
    
    console.debug("[consent] UI updated", {
        cookieAccepted,
        smsAccepted,
        acceptedTosVersion: getAcceptedTosVersion(),
        requiredTosVersion: CURRENT_TOS_VERSION,
        tosCurrent
    });
    updateStatusText();
}

function showCurrentTosVersionInModal() {
    const slot = document.getElementById("tosVersionDisplay");
    if (slot) {
        slot.textContent = `v${CURRENT_TOS_VERSION}`;
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
            console.log(`[consent] ToS accepted (persistent) v${CURRENT_TOS_VERSION}`);
            setPersistentCookie(RG_TOS_VERSION, CURRENT_TOS_VERSION);
            tosModal.hide();
            updateUIState();
        });
    }
    
    // Prevent submit unless all conditions met
    const form = document.getElementById("registrationConsentForm");
    const registerBtn = document.getElementById("registerBtn");
    if (form && registerBtn) {
        form.addEventListener("submit", (evt) => {
            const canSubmit = hasAcceptedCookies() && hasAcceptedSmsPolicy() && isTosCurrent();
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
    updateUIState();
    
    // If user has an older ToS accepted, nudge them by enabling ToS button and optional auto-open logic
    const cookieAccepted = hasAcceptedCookies();
    const smsAccepted = hasAcceptedSmsPolicy();
    const tosCurrent = isTosCurrent();
    if (cookieAccepted && smsAccepted && !tosCurrent) {
        const tosModalEl = document.getElementById("tosModal");
        if (tosModalEl) {
            // Optional: auto-open ToS if outdated. Comment out if you prefer manual.
            const tosModal = new bootstrap.Modal(tosModalEl);
            showCurrentTosVersionInModal();
            tosModal.show();
        }
    }
    
    wireConsentEvents();
});
/* STOP: bootstrap */
