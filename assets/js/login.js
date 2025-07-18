// login.js

const poolData = {
    UserPoolId: 'us-east-1_5j4lDdV1A',
    ClientId: '2mnmesf3f1olrit42g2oepmiak'
};

const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");
    const forgotLink = document.getElementById("forgotPasswordLink");
    
    if (loginForm) {
        loginForm.addEventListener("submit", function (event) {
            event.preventDefault();
            handleLogin();
        });
    }
    
    if (forgotLink) {
        forgotLink.addEventListener("click", function (event) {
            event.preventDefault();
            handleForgotPassword();
        });
    }
});

function handleLogin() {
    const email = document.getElementById("email")?.value?.trim();
    const password = document.getElementById("password")?.value;
    
    console.log("🔐 Login attempt for:", email);
    
    if (!email || !password) {
        alert("Please enter both email and password.");
        console.warn("❌ Missing login credentials");
        return;
    }
    
    if (!email.includes("@")) {
        alert("Please enter a valid email address to log in.");
        console.warn("❌ Rejected non-email login attempt");
        return;
    }
    
    const authDetails = new AmazonCognitoIdentity.AuthenticationDetails({
        Username: email,
        Password: password
    });
    
    const userData = {
        Username: email,
        Pool: userPool
    };
    
    const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
    
    cognitoUser.authenticateUser(authDetails, {
        onSuccess: function (result) {
            const idToken = result.getIdToken().getJwtToken();
            localStorage.setItem("id_token", idToken);
            console.log("✅ Login successful, token stored.");
            window.location.href = "/secure/index.html";
        },
        
        onFailure: function (err) {
            console.error("❌ Login failed:", err);
            alert("Login failed: " + (err.message || JSON.stringify(err)));
        },
        
        mfaRequired: function (codeDeliveryDetails) {
            console.log("📲 MFA required via:", codeDeliveryDetails.DeliveryMedium);
            const mfaCode = prompt("Enter the MFA code sent to your phone:");
            cognitoUser.sendMFACode(mfaCode, this);
        }
    });
}

function handleForgotPassword() {
    const email = prompt("Enter your email address:");
    if (!email || !email.includes("@")) {
        alert("Please enter a valid email address.");
        return;
    }
    
    console.log("🔁 Forgot password initiated for:", email);
    
    const userData = {
        Username: email,
        Pool: userPool
    };
    
    const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
    
    cognitoUser.forgotPassword({
        onSuccess: function () {
            alert("A verification code has been sent to your email/phone.");
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
