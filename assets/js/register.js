/* START: Register page bootstrap and submit wiring */
document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("rocketGeekSignupForm");
    if (!form) {
        console.warn("[register.js] Signup form not found: #rocketGeekSignupForm");
        return;
    }
    
    console.info("[register.js] Page ready. Wiring submit and checking consent state…");
    RG_GATE_logConsentState();
    
    // Intercept submit to enforce consent before proceeding
    form.addEventListener("submit", function (event) {
        event.preventDefault();
        RG_GATE_consentThenRegister();
    });
});
/* END: Register page bootstrap and submit wiring */


/* START: Main form handler with validation and consent gate */
function RG_GATE_consentThenRegister() {
    // 1) Require cookie policy acceptance
    if (!RG_GATE_hasAcceptedCookies()) {
        console.warn("[register.js] Blocking submit: cookie policy not accepted");
        RG_GATE_openCookiePolicyModalOrAlert();
        return;
    }
    
    // 2) Require current ToS acceptance
    if (!RG_GATE_isTosCurrent()) {
        const have = RG_GATE_getAcceptedTosVersion() || "none";
        const need = RG_GATE_CURRENT_TOS_VERSION;
        console.warn(`[register.js] Blocking submit: ToS not current (have: ${have}, need: ${need})`);
        RG_GATE_openTosModalOrAlert();
        return;
    }
    
    // 3) Proceed with registration
    console.log("[register.js] Consent satisfied; proceeding with registration");
    rocketGeekSignupForm();
}

function rocketGeekSignupForm() {
    console.log("[register.js] Handling form submission securely");
    
    const firstName      = document.getElementById("firstName")?.value?.trim();
    const lastName       = document.getElementById("lastName")?.value?.trim();
    const email          = document.getElementById("email")?.value?.trim();
    const phone          = document.getElementById("phoneNumber")?.value?.trim();
    const zipCode        = document.getElementById("zipCode")?.value?.trim();
    const password       = document.getElementById("passwordInput")?.value;
    const repeatPassword = document.getElementById("repeatPasswordInput")?.value;
    
    if (password !== repeatPassword) {
        alert("Passwords do not match.");
        console.warn("[register.js] Password mismatch");
        return;
    }
    
    const attributeList = [
        new AmazonCognitoIdentity.CognitoUserAttribute({ Name: "given_name",      Value: firstName || "" }),
        new AmazonCognitoIdentity.CognitoUserAttribute({ Name: "family_name",     Value: lastName  || "" }),
        new AmazonCognitoIdentity.CognitoUserAttribute({ Name: "email",           Value: email     || "" }),
        new AmazonCognitoIdentity.CognitoUserAttribute({ Name: "phone_number",    Value: phone     || "" }),
        new AmazonCognitoIdentity.CognitoUserAttribute({ Name: "custom:zip_code", Value: zipCode   || "" })
    ];
    
    const poolData = {
        // UserPoolId: 'us-east-1_5j4lDdV1A',
        // ClientId:   '2mnmesf3f1olrit42g2oepmiak'
        UserPoolId: 'us-east-1_clrYuNqI3',
        ClientId:   '3u51gurg8r0ri4riq2isa8aq7h'
    };
    
    const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
    performRegistration({ email, password, attributeList, userPool });
}
/* END: Main form handler with validation and consent gate */


/* START: Registration call to Cognito */
function performRegistration({ email, password, attributeList, userPool }) {
    if (!userPool) {
        console.error("[register.js] Cognito userPool not initialized");
        alert("Registration failed: configuration error.");
        return;
    }
    
    console.log("[register.js] Initiating Cognito signUp for:", email);
    
    userPool.signUp(email, password, attributeList, null, function (err, result) {
        if (err) {
            console.error("Sign-up error:", err);
            alert("Registration failed: " + (err.message || JSON.stringify(err)));
            return;
        }
        
        console.log("Sign-up successful:", result);
        alert(
            "Sign-up successful!\n\n" +
            "Please check your email and phone for verification codes.\n" +
            "The verification email will come from a domain like 'amazonaws.com' or 'verificationemail.com'. " +
            "Be sure to check your spam folder if you don’t see it."
        );
        
        const encodedEmail = encodeURIComponent(email || "");
        window.location.href = `/confirm.html?email=${encodedEmail}`;
    });
}
/* END: Registration call to Cognito */


/* START: Consent helpers (prefixed RG_GATE_ to avoid any collision) */
// Keep this in sync with your consent policy; distinct name to avoid conflicts
const RG_GATE_CURRENT_TOS_VERSION = "1.0.0";

function RG_GATE_getCookie(name) {
    const encodedName = encodeURIComponent(name) + "=";
    const parts = document.cookie.split(";").map(s => s.trim());
    for (const part of parts) {
        if (part.startsWith(encodedName)) {
            return decodeURIComponent(part.substring(encodedName.length));
        }
    }
    return null;
}

function RG_GATE_hasAcceptedCookies() {
    // Uses the cookie set by registration-consent.js
    return RG_GATE_getCookie("rg_cookie_accepted") === "true";
}

function RG_GATE_getAcceptedTosVersion() {
    // Uses the cookie set by registration-consent.js
    return RG_GATE_getCookie("rg_tos_version");
}

function RG_GATE_isTosCurrent() {
    return RG_GATE_getAcceptedTosVersion() === RG_GATE_CURRENT_TOS_VERSION;
}

function RG_GATE_logConsentState() {
    console.debug("[register.js] Consent state", {
        cookieAccepted: RG_GATE_hasAcceptedCookies(),
        acceptedTosVersion: RG_GATE_getAcceptedTosVersion(),
        requiredTosVersion: RG_GATE_CURRENT_TOS_VERSION,
        tosCurrent: RG_GATE_isTosCurrent()
    });
}
/* END: Consent helpers (prefixed RG_GATE_ to avoid any collision) */


/* START: Modal helpers (do not depend on consent script internals) */
function RG_GATE_openCookiePolicyModalOrAlert() {
    const modalEl = document.getElementById("cookiePolicyModal");
    if (modalEl && window.bootstrap && window.bootstrap.Modal) {
        console.log("[register.js] Opening Cookie Policy modal");
        new bootstrap.Modal(modalEl).show();
    } else {
        alert("Please review and accept the Cookie Policy to continue.");
    }
}

function RG_GATE_openTosModalOrAlert() {
    const modalEl = document.getElementById("tosModal");
    if (modalEl && window.bootstrap && window.bootstrap.Modal) {
        console.log("[register.js] Opening Terms of Service modal");
        new bootstrap.Modal(modalEl).show();
    } else {
        alert("Please review and accept the latest Terms of Service to continue.");
    }
}
/* END: Modal helpers (do not depend on consent script internals) */
