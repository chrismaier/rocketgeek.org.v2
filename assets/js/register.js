document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("rocketGeekSignupForm");
    
    form.addEventListener("submit", function (event) {
        event.preventDefault(); // Prevent default browser submit
        rocketGeekSignupForm(); // Call your logic
    });
});

function rocketGeekSignupForm() {
    console.log("Securely handling form submission");
    
    const firstName = document.getElementById("firstName")?.value?.trim();
    const lastName = document.getElementById("lastName")?.value?.trim();
    const email = document.getElementById("email")?.value?.trim();
    const phone = document.getElementById("phoneNumber")?.value?.trim();
    const zipCode = document.getElementById("zipCode")?.value?.trim();
    const password = document.getElementById("passwordInput")?.value;
    const repeatPassword = document.getElementById("repeatPasswordInput")?.value;
    
    if (password !== repeatPassword) {
        alert("Passwords do not match.");
        return;
    }
    
    const attributeList = [
        new AmazonCognitoIdentity.CognitoUserAttribute({ Name: "given_name", Value: firstName }),
        new AmazonCognitoIdentity.CognitoUserAttribute({ Name: "family_name", Value: lastName }),
        new AmazonCognitoIdentity.CognitoUserAttribute({ Name: "email", Value: email }),
        new AmazonCognitoIdentity.CognitoUserAttribute({ Name: "phone_number", Value: phone }),
        new AmazonCognitoIdentity.CognitoUserAttribute({ Name: "custom:zip_code", Value: zipCode })
    ];
    
    const poolData = {
        UserPoolId: 'us-east-1_5j4lDdV1A',
        ClientId: '2mnmesf3f1olrit42g2oepmiak'
    };
    
    const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
    
    userPool.signUp(email, password, attributeList, null, function (err, result) {
        if (err) {
            console.error("❌ Sign-up error:", err);
            alert("Registration failed: " + (err.message || JSON.stringify(err)));
            return;
        }
        
        console.log("✅ Sign-up successful:", result);
        alert(
            "Sign-up successful!\n\n" +
            "Please check your email and phone for verification codes.\n" +
            "The verification email will come from a domain like 'amazonaws.com' or 'verificationemail.com'. " +
            "Be sure to check your spam folder if you don’t see it."
        );
        
        // Redirect to confirmation page with email pre-filled
        window.location.href = `/confirm.html?email=${encodeURIComponent(email)}`;
    });
}
