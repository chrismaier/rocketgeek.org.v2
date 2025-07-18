// register.js

const poolData = {
    UserPoolId: 'us-east-1_smCpPB8Ob',
    ClientId: '1mebkk2s29usvt9ko3djhith6b'
};

const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

function rocketGeekSignupForm() {
    console.log("🚀 rocketGeekSignupForm triggered");
    
    const firstName = document.getElementById("firstName")?.value?.trim();
    const lastName = document.getElementById("lastName")?.value?.trim();
    const email = document.getElementById("email")?.value?.trim();
    const phone = document.getElementById("phoneNumber")?.value?.trim();
    const zipCode = document.getElementById("zipCode")?.value?.trim();
    const password = document.getElementById("passwordInput")?.value;
    const repeatPassword = document.getElementById("repeatPasswordInput")?.value;
    
    console.log("📥 Collected form data:", {
        firstName, lastName, email, phone, zipCode
    });
    
    if (!email || !phone || !password) {
        alert("Missing required fields.");
        console.warn("❌ Missing one or more required fields.");
        return false;
    }
    
    if (password !== repeatPassword) {
        alert("Passwords do not match.");
        console.warn("❌ Password mismatch.");
        return false;
    }
    
    const attributeList = [];
    
    try {
        attributeList.push(new AmazonCognitoIdentity.CognitoUserAttribute({ Name: "given_name", Value: firstName }));
        attributeList.push(new AmazonCognitoIdentity.CognitoUserAttribute({ Name: "family_name", Value: lastName }));
        attributeList.push(new AmazonCognitoIdentity.CognitoUserAttribute({ Name: "email", Value: email }));
        attributeList.push(new AmazonCognitoIdentity.CognitoUserAttribute({ Name: "phone_number", Value: phone }));
        attributeList.push(new AmazonCognitoIdentity.CognitoUserAttribute({ Name: "custom:zip_code", Value: zipCode }));
    } catch (e) {
        console.error("🚨 Error building attribute list:", e);
        alert("Error preparing registration attributes.");
        return false;
    }
    
    userPool.signUp(email, password, attributeList, null, function (err, result) {
        if (err) {
            console.error("❌ Sign-up error:", err);
            alert("Registration failed: " + (err.message || JSON.stringify(err)));
            return false;
        }
        
        console.log("✅ Sign-up successful:", result);
        alert("Sign-up successful! Please check your email and phone for verification codes.");
    });
    
    return false; // Always prevent form default submit
}
