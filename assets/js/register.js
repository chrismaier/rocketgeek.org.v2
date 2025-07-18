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
        UserPoolId: 'us-east-1_smCpPB8Ob',
        ClientId: '1mebkk2s29usvt9ko3djhith6b'
    };
    
    const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
    
    userPool.signUp(email, password, attributeList, null, function (err, result) {
        if (err) {
            console.error("Signup error:", err);
            alert(err.message || JSON.stringify(err));
            return;
        }
        
        console.log("Signup success:", result);
        alert("Signup successful! Please verify your phone and email.");
    });
}
