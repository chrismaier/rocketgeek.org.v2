// Function to check password complexity
function checkPasswordComplexity(password) {
    // Add your password complexity requirements here
    // For example, you can check for minimum length, presence of uppercase, lowercase, digits, and special characters
    const minLength = 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    // Return true if password meets complexity requirements, false otherwise
    return (
        password.length >= minLength &&
        hasUppercase &&
        hasLowercase &&
        hasDigit &&
        hasSpecialChar
    );
}

// Function to validate form fields
function validateForm(form) {
    // Get form elements
    const firstNameInput = form.querySelector('#firstName');
    const lastNameInput = form.querySelector('#lastName');
    const emailInput = form.querySelector('#email');
    const phoneNumberInput = form.querySelector('#phoneNumber');
    const zipCodeInput = form.querySelector('#zipCode');
    const passwordInput = form.querySelector('#passwordInput');
    const repeatPasswordInput = form.querySelector('#repeatPasswordInput');
    
    // Check if any field is empty
    if (
        !firstNameInput.value ||
        !lastNameInput.value ||
        !emailInput.value ||
        !phoneNumberInput.value ||
        !zipCodeInput.value ||
        !passwordInput.value ||
        !repeatPasswordInput.value
    ) {
        alert('Please fill in all fields!');
        return false;
    }
    
    // Check if passwords match
    if (passwordInput.value !== repeatPasswordInput.value) {
        alert('Passwords do not match!');
        return false;
    }
    
    // Check password complexity
    if (!checkPasswordComplexity(passwordInput.value)) {
        alert('Password must meet complexity requirements!');
        return false;
    }
    
    // Placeholder for calling out to zip code validation service
    // You can replace this with your actual zip code validation logic
    // Example:
    // if (!validateZipCode(zipCodeInput.value)) {
    //     alert('Invalid zip code!');
    //     return false;
    // }
    
    // Placeholder for calling out to phone number validation service
    // You can replace this with your actual phone number validation logic
    // Example:
    // if (!validatePhoneNumber(phoneNumberInput.value)) {
    //     alert('Invalid phone number!');
    //     return false;
    // }
    
    // Form is valid
    return true;
}

// Function to handle form submission
function rocketGeekSignupForm(event) {
    // Prevent the default form submission behavior
    event.preventDefault();
    
    // Get form element
    const form = event.target;
    
    // Validate form
    if (validateForm(form)) {
        // If form is valid, continue with form submission or further processing
        // Example: Submit the form
        form.submit();
    }
}
