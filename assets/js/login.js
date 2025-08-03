// ==============================
// START: Cognito Pool Setup
// ==============================
const poolData = {
    UserPoolId: 'us-east-1_clrYuNqI3',
    ClientId: '3u51gurg8r0ri4riq2isa8aq7h'
};
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
        forgotLink.addEventListener("click", function (e) {
            e.preventDefault();
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
    
    const authDetails = new AmazonCognitoIdentity.AuthenticationDetails({
        Username: email,
        Password: password
    });
    
    const cognitoUser = new AmazonCognitoIdentity.CognitoUser({
        Username: email,
        Pool: userPool
    });
    
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
        const username = result.getIdToken().payload["cognito:username"];
        localStorage.setItem("idToken", idToken);
        console.log("✅ Login successful for:", username);
        
        try {
            const payload = JSON.parse(atob(idToken.split('.')[1]));
            console.log("🧾 Decoded ID token payload:", payload);
        } catch (err) {
            console.warn("⚠️ Could not decode ID token payload:", err);
        }
        
        alert("Login successful! Setting up your profile...");
        
        const response = await fetch("https://api.rocketgeek.org/get-profile", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${idToken}`,
                "Content-Type": "application/json"
            },
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
    
    const cognitoUser = new AmazonCognitoIdentity.CognitoUser({
        Username: email,
        Pool: userPool
    });
    
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
            cognitoUser.getSession((err, session) => {
                if (err) return reject(err);
                resolve(session);
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
        
        try {
            const payload = JSON.parse(atob(idToken.split('.')[1]));
            console.log("🧾 Decoded ID token payload:", payload);
            
            // Precise logging
            console.log(`✅ email_verified [${payload.email || "unknown"}] : ${payload.email_verified}`);
            console.log(`📞 phone_number_verified [${payload.phone_number || "unknown"}] : ${payload.phone_number_verified}`);
        } catch (err) {
            console.warn("⚠️ Could not decode JWT payload:", err);
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
