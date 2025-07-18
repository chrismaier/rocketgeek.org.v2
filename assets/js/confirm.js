// confirm.js

const poolData = {
    UserPoolId: 'us-east-1_5j4lDdV1A',
    ClientId: '2mnmesf3f1olrit42g2oepmiak'
};

const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("confirmForm");
    const emailInput = document.getElementById("email");
    const codeInput = document.getElementById("code");
    
    // Autofill email from query param
    const params = new URLSearchParams(window.location.search);
    const prefillEmail = params.get("email");
    if (prefillEmail && emailInput) {
        emailInput.value = decodeURIComponent(prefillEmail);
    }
    
    form.addEventListener("submit", function (event) {
        event.preventDefault();
        
        const email = emailInput?.value?.trim();
        const code = codeInput?.value?.trim();
        
        console.log("📩 Attempting confirmation:", { email, code });
        
        if (!email || !code) {
            alert("Please enter both your email and confirmation code.");
            console.warn("❌ Missing email or confirmation code.");
            return;
        }
        
        const userData = {
            Username: email,
            Pool: userPool
        };
        
        const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
        
        cognitoUser.confirmRegistration(code, true, function (err, result) {
            if (err) {
                console.error("❌ Confirmation error:", err);
                alert("Confirmation failed: " + (err.message || JSON.stringify(err)));
                return;
            }
            
            console.log("✅ Confirmation successful:", result);
            alert("Your account has been successfully confirmed!");
            window.location.href = "/login.html"; // or a success page
        });
    });
});
