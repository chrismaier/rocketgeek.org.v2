// login.js

// ==============================
// START: Cognito Pool Setup
// ==============================

const poolData = { UserPoolId: "us-east-1_clrYuNqI3", ClientId: "3u51gurg8r0ri4riq2isa8aq7h" };
const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

// ==============================
// END: Cognito Pool Setup
// ==============================

// ==============================
// START: DOMContentLoaded Logic
// ==============================
document.addEventListener("DOMContentLoaded", function () {
    const form = document.querySelector("form.user");
    const emailField = document.getElementById("email");
    const passwordField = document.getElementById("password");
    const debugBtn = document.getElementById("debugTokenButton");

    if (!form || !emailField || !passwordField) {
        console.error("❌ Login form elements not found.");
        return;
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        handleLogin(emailField, passwordField);
    });

    const forgotLink = document.getElementById("forgotPasswordLink");
    if (forgotLink) {
        forgotLink.addEventListener("click", function (event) {
            event.preventDefault();
            handleForgotPassword(emailField);
        });
    }

    if (debugBtn) {
        debugBtn.addEventListener("click", handleDebugToken);
    } else {
        console.warn("⚠️ Debug token button not found.");
    }
});
// ==============================
// END: DOMContentLoaded Logic
// ==============================

// ==============================
// START: UI Spinner Helpers
// ==============================
function setButtonLoading(button, loading) {
    if (!button) return;
    if (loading) {
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Please wait...`;
        button.disabled = true;
    } else {
        button.innerHTML = button.dataset.originalText || "Submit";
        button.disabled = false;
    }
}
// ==============================
// END: UI Spinner Helpers
// ==============================

// ==============================
// START: JWT Helpers
// ==============================
function base64UrlToBase64(base64UrlString) {
    if (typeof base64UrlString !== "string" || base64UrlString.length === 0) return "";
    let base64String = base64UrlString.replace(/-/g, "+");
    base64String = base64String.replace(/_/g, "/");
    const paddingRequired = (4 - (base64String.length % 4)) % 4;
    if (paddingRequired === 2) base64String = base64String + "==";
    if (paddingRequired === 3) base64String = base64String + "=";
    return base64String;
}

function decodeJwtPayload(jwtToken) {
    if (typeof jwtToken !== "string") return null;
    const jwtParts = jwtToken.split(".");
    if (jwtParts.length < 2) return null;

    const payloadPart = jwtParts[1];
    const base64Payload = base64UrlToBase64(payloadPart);
    if (!base64Payload) return null;

    try {
        const jsonString = atob(base64Payload);
        return JSON.parse(jsonString);
    } catch (err) {
        console.warn("⚠️ Could not decode JWT payload:", err);
        return null;
    }
}

function isFullyConfirmed(jwtPayload) {
    if (!jwtPayload || typeof jwtPayload !== "object") return false;
    const emailVerified = jwtPayload.email_verified === true;
    const phoneVerified = jwtPayload.phone_number_verified === true;
    return emailVerified && phoneVerified;
}
// ==============================
// END: JWT Helpers
// ==============================

// ==============================
// START: Login Handler
// ==============================
async function handleLogin(emailField, passwordField) {
    const email = emailField.value.trim();
    const password = passwordField.value;
    const loginBtn = document.querySelector("form.user button[type='submit']");

    console.log("🔐 Login attempt for:", email);

    if (!email || !password) {
        alert("Please enter both email and password.");
        console.warn("❌ Missing login credentials");
        return;
    }

    if (!email.includes("@")) {
        alert("Please use your email address to log in.");
        console.warn("❌ Rejected non-email login attempt");
        return;
    }

    setButtonLoading(loginBtn, true);

    const authDetails = new AmazonCognitoIdentity.AuthenticationDetails({ Username: email, Password: password });
    const cognitoUser = new AmazonCognitoIdentity.CognitoUser({ Username: email, Pool: userPool });

    try {
        const result = await new Promise((resolve, reject) => {
            cognitoUser.authenticateUser(authDetails, {
                onSuccess: resolve,
                onFailure: reject,
                mfaRequired: function (codeDeliveryDetails) {
                    console.log("📲 MFA required via:", codeDeliveryDetails.DeliveryMedium);
                    const mfaCode = prompt("Enter the MFA code sent to your phone:");
                    cognitoUser.sendMFACode(mfaCode, this);
                }
            });
        });

        const idToken = result.getIdToken().getJwtToken();
        localStorage.setItem("idToken", idToken);

        const jwtPayload = decodeJwtPayload(idToken);
        const username = jwtPayload && jwtPayload["cognito:username"] ? jwtPayload["cognito:username"] : null;

        console.log("✅ Login successful for:", username || "unknown");

        if (jwtPayload) {
            console.log("🧾 Decoded ID token payload:", jwtPayload);
        } else {
            console.warn("⚠️ Could not decode ID token payload; treating as not verified.");
        }

        // ------------------------------
        // GATING: Block app actions until BOTH email + phone are verified
        // ------------------------------
        if (!isFullyConfirmed(jwtPayload)) {
            alert("Your account still needs verification. Please complete confirmation to continue.");
            window.location.href = "/confirm.html";
            return;
        }

        alert("Login successful! Setting up your profile...");

        const apiBase = (window.RG_API_BASE && typeof window.RG_API_BASE === "string") ? window.RG_API_BASE : "https://api.rocketgeek.org";
        const getProfileUrl = apiBase.replace(/\/$/, "") + "/get-profile";

        const response = await fetch(getProfileUrl, {
            method: "POST",
            headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ username })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.created) {
            console.log(`📁 Profile created for user [${username}]`);
            alert("Welcome! We've created your user profile.");
        } else {
            console.log(`📁 Profile loaded for existing user [${username}]`);
        }

        window.location.href = "/home.html";
    } catch (err) {
        console.error("❌ Login failed:", err);
        alert("Login failed: " + (err.message || JSON.stringify(err)));
    } finally {
        setButtonLoading(loginBtn, false);
    }
}
// ==============================
// END: Login Handler
// ==============================

// ==============================
// START: Forgot Password Handler
// ==============================
function handleForgotPassword(emailField) {
    const email = emailField.value.trim();

    if (!email || !email.includes("@")) {
        alert("Please enter a valid email address to reset your password.");
        return;
    }

    console.log("🔁 Forgot password requested for:", email);

    const cognitoUser = new AmazonCognitoIdentity.CognitoUser({ Username: email, Pool: userPool });

    cognitoUser.forgotPassword({
        onSuccess: function () {
            alert("A verification code has been sent to your email or phone.");
        },
        onFailure: function (err) {
            console.error("❌ Forgot password error:", err);
            alert("Error: " + (err.message || JSON.stringify(err)));
        },
        inputVerificationCode: function () {
            const code = prompt("Enter the verification code you received:");
            const newPassword = prompt("Enter your new password:");

            cognitoUser.confirmPassword(code, newPassword, {
                onSuccess: function () {
                    alert("Password reset successful. You can now log in.");
                },
                onFailure: function (err) {
                    console.error("❌ Password reset failed:", err);
                    alert("Error: " + (err.message || JSON.stringify(err)));
                }
            });
        }
    });
}
// ==============================
// END: Forgot Password Handler
// ==============================

// ==============================
// START: Debug JWT Token Handler
// ==============================
async function handleDebugToken(event) {
    const debugBtn = event.currentTarget;
    setButtonLoading(debugBtn, true);
    const start = performance.now();

    try {
        const cognitoUser = userPool.getCurrentUser();

        if (!cognitoUser) {
            alert("No user is currently logged in.");
            console.warn("⚠️ No Cognito user found.");
            return;
        }

        const session = await new Promise((resolve, reject) => {
            cognitoUser.getSession((err, sessionResult) => {
                if (err) return reject(err);
                resolve(sessionResult);
            });
        });

        const duration = performance.now() - start;
        console.log(`⏱️ getSession() completed in ${duration.toFixed(2)}ms`);

        if (!session.isValid()) {
            alert("Session is not valid.");
            console.warn("⚠️ Invalid session.");
            return;
        }

        const idToken = session.getIdToken().getJwtToken();
        console.log("✅ ID Token:", idToken);

        const payload = decodeJwtPayload(idToken);
        if (payload) {
            console.log("🧾 Decoded ID token payload:", payload);
            console.log(`✅ email_verified [${payload.email || "unknown"}] : ${payload.email_verified}`);
            console.log(`📞 phone_number_verified [${payload.phone_number || "unknown"}] : ${payload.phone_number_verified}`);
        } else {
            console.warn("⚠️ Could not decode JWT payload.");
        }

        alert("Token has been logged to the DevTools console.");
    } catch (err) {
        console.error("❌ JWT debug failed:", err);
        alert("Unable to retrieve token: " + (err.message || JSON.stringify(err)));
    } finally {
        setButtonLoading(debugBtn, false);
    }
}
// ==============================
// END: Debug JWT Token Handler
// ==============================
