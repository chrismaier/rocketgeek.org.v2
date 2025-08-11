/* START: Register page bootstrap and submit wiring */
document.addEventListener("DOMContentLoaded", function () {
    const signupForm = document.getElementById("rocketGeekSignupForm");
    if (!signupForm) {
        console.warn("[register.js] Signup form not found: #rocketGeekSignupForm");
        return;
    }
    
    console.info("[register.js] Page ready. Checking consent cookies…");
    logConsentState();
    
    // Intercept submit to enforce consent before proceeding
    signupForm.addEventListener("submit", function (event) {
        event.preventDefault();
        gateConsentThenRegister();
    });
});
/* END: Register page bootstrap and submit wiring */


/* START: Consent helpers (must mirror names used by registration-consent.js) */
const RG_COOKIE_ACCEPTED = "rg_cookie_accepted";
const RG_TOS_VERSION = "rg_tos_version";
// Keep this in sync with registration-consent.js
const CURRENT_TOS_VERSION = "1.0.0";

function getCookie(name) {
    const encodedName = encodeURIComponent(name) + "=";
    return document.cookie
        .split(";")
        .map(s => s.trim())
        .filter(Boolean)
        .reduce((found, part) => {
            if (found !== null) return found;
            return part.startsWith(encodedName) ? decodeURIComponent(part.substring(encodedName.length)) : null;
        }, null);
}

function hasAcceptedCookies() {
    return getCookie(RG_COOKIE_ACCEPTED) === "true";
}

function getAcceptedTosVersion() {
    return getCookie(RG_TOS_VERSION);
}

function isTosCurrent() {
    return getAcceptedTosVersion() === CURRENT_TOS_VERSION;
}

function isConsentComplete() {
    return hasAcceptedCookies() && isTosCurrent();
}

function logConsentState() {
    console.debug("[register.js] Consent state", {
        cookieAccepted: hasAcceptedCookies(),
        acceptedTosVersion: getAcceptedTosVersion(),
        requiredTosVersion: CURRENT_TOS_VERSION,
        tosCurrent: isTosCurrent()
    });
}
/* END: Consent helpers */


/* START: Modal helpers */
function openCookiePolicyModalOrAlert() {
    const modalEl = document.getElementById("cookiePolicyModal");
    if (modalEl && window.bootstrap && window.bootstrap.Modal) {
        console.log("[register.js] Opening Cookie Policy modal");
        new bootstrap.Modal(modalEl).show();
    } else {
        alert("Please review and accept the Cookie Policy to continue.");
    }
}

function openTosModalOrAlert() {
    const modalEl = document.getElementById("tosModal");
    if (modalEl && window.bootstrap && window.bootstrap.Modal) {
        console.log("[register.js] Opening Terms of Service modal");
        new bootstrap.Modal(modalEl).show();
    } else {
        alert("Please review and accept the latest Terms of Service to continue.");
    }
}
/* END: Modal helpers */


/* START: Consent gate → proceed or nudge */
function gateConsentThenRegister() {
    // If cookies are not accepted yet, nudge with Cookie Policy
    if (!hasAcceptedCookies()) {
        console.warn("[register.js] Blocking submit: cookie policy not accepted");
        openCookiePolicyModalOrAlert();
        return;
    }
    
    // If ToS is missing or outdated, nudge with ToS modal
    if (!isTosCurrent()) {
        const current = getAcceptedTosVersion();
        console.warn(`[register.js] Blocking submit: ToS not current (have: ${current || "none"}, need: ${CURRENT_TOS_VERSION})`);
        openTosModalOrAlert();
        return;
    }
    
    // All good → proceed
    console.log("[register.js] Consent satisfied; proceeding with registration");
    rocketGeekSignupForm();
}
/* END: Consent gate → proceed or nudge */


/* START: Main form handler with validation and Cognito sign-up */
function rocketGeekSignupForm() {
    console.log("[register.js] Handling form submission securely");
    
    // Gather inputs
    const firstName = document.getElementById("firstName")?.value?.trim();
    const lastName  = document.getElementById("lastName")?.value?.trim();
    const email     = document.getElementById("email")?.value?.trim();
    const phone     = document.getElementById("phoneNumber")?.value?.trim();
    const zipCode   = document.getElementById("zipCode")?.value?.trim();
    const password  = document.getElementById("passwordInput")?.value;
    const repeatPwd = document.getElementById("repeatPasswordInput")?.value;
    
    if (password !== repeatPwd) {
        console.warn("[register.js] Password mismatch");
        alert("Passwords do not match.");
        return;
    }
    
    // Cognito attributes
    const attributeList = [
        new AmazonCognitoIdentity.CognitoUserAttribute({ Name: "given_name",       Value: firstName || "" }),
        new AmazonCognitoIdentity.CognitoUserAttribute({ Name: "family_name",      Value: lastName  || "" }),
        new AmazonCognitoIdentity.CognitoUserAttribute({ Name: "email",            Value: email     || "" }),
        new AmazonCognitoIdentity.CognitoUserAttribute({ Name: "phone_number",     Value: phone     || "" }),
        new AmazonCognitoIdentity.CognitoUserAttribute({ Name: "custom:zip_code",  Value: zipCode   || "" })
    ];
    
    // Pool configuration (current)
    const poolData = {
        // UserPoolId: 'us-east-1_5j4lDdV1A',
        // ClientId:   '2mnmesf3f1olrit42g2oepmiak'
        UserPoolId: 'us-east-1_clrYuNqI3',
        ClientId:   '3u51gurg8r0ri4riq2isa8aq7h'
    };
    
    const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
    performRegistration({ email, password, attributeList, userPool });
}
/* END: Main form handler with validation and Cognito sign-up */


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
            console.error("[register.js] Sign-up error:", err);
            alert("Registration failed: " + (err.message || JSON.stringify(err)));
            return;
        }
        
        console.log("[register.js] Sign-up successful:", result);
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
