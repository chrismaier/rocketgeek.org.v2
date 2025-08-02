// login.js

const poolData = {
//    UserPoolId: 'us-east-1_5j4lDdV1A',
//    ClientId: '2mnmesf3f1olrit42g2oepmiak'
    UserPoolId: 'us-east-1_clrYuNqI3',
    ClientId: '3u51gurg8r0ri4riq2isa8aq7h'
};

const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

document.addEventListener("DOMContentLoaded", function () {
    const form = document.querySelector("form.user");
    const emailField = document.getElementById("email");
    const passwordField = document.getElementById("password");
    
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
});

function handleLogin(emailField, passwordField) {
    const email = emailField.value.trim();
    const password = passwordField.value;
    
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
    
    const authDetails = new AmazonCognitoIdentity.AuthenticationDetails({
        Username: email,
        Password: password
    });
    
    const cognitoUser = new AmazonCognitoIdentity.CognitoUser({
        Username: email,
        Pool: userPool
    });
    
    cognitoUser.authenticateUser(authDetails, {
        onSuccess: async function (result) {
            const idToken = result.getIdToken().getJwtToken();
            const username = result.getIdToken().payload["cognito:username"];
            localStorage.setItem("id_token", idToken);
            
            console.log("✅ Login successful for:", username);
            alert("Login successful! Setting up your profile...");
            
            try {
                const response = await fetch("https://api.rocketgeek.org/get-profile", {
                    method: "POST",
                    headers: {
                        Authorization: idToken,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ username: username }) // Can be omitted if handled in backend
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.created) {
                    console.log("📁 Profile was newly created.");
                    alert("Welcome! We've created your user profile.");
                } else {
                    console.log("📁 Existing profile loaded.");
                }
                
                window.location.href = "/home.html";
                
            } catch (err) {
                console.error("🚨 Profile setup failed:", err);
                alert("Login succeeded, but profile setup failed. Please contact support.");
            }
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
