// register.js

const poolData = {
    UserPoolId: 'us-east-1_smCpPB8Ob',
    ClientId: '1mebkk2s29usvt9ko3djhith6b'
};

const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

function rocketGeekSignupForm() {
    const email = document.getElementById("email").value;
    const phone = document.getElementById("phone_number").value;
    const password = document.getElementById("password").value;
    
    const attributeList = [
        new AmazonCognitoIdentity.CognitoUserAttribute({ Name: "email", Value: email }),
        new AmazonCognitoIdentity.CognitoUserAttribute({ Name: "phone_number", Value: phone })
    ];
    
    userPool.signUp(email, password, attributeList, null, function (err, result) {
        if (err) {
            alert(err.message || JSON.stringify(err));
            return false;
        }
        alert("Sign-up successful! Please check your email and phone for verification codes.");
        return true; // Allow form to complete if necessary
    });
    
    return false; // Prevent default form submission
}
