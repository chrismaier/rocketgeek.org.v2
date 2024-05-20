document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('rocketGeekSignupForm');
    form.addEventListener('submit', rocketGeekSignupForm);
    
    function validateForm(formData) {
        let isValid = true;
        let errorMessage = '';
        
        // Validate first name (required)
        if (!formData.first_name) {
            isValid = false;
            errorMessage += 'First Name is required.\n';
        }
        
        // Validate last name (required)
        if (!formData.last_name) {
            isValid = false;
            errorMessage += 'Last Name is required.\n';
        }
        
        // Validate email (required)
        if (!formData.email) {
            isValid = false;
            errorMessage += 'Email Address is required.\n';
        }
        
        // Validate phone number (optional)
        // Uncomment the next lines to make phone number required
        // if (!formData.phone_number) {
        //     isValid = false;
        //     errorMessage += 'Phone Number is required.\n';
        // }
        
        // Validate zip code (optional)
        // Uncomment the next lines to make zip code required
        // if (!formData.zip_code) {
        //     isValid = false;
        //     errorMessage += 'Zip Code is required.\n';
        // }
        
        // Validate password (required)
        if (!formData.password) {
            isValid = false;
            errorMessage += 'Password is required.\n';
        }
        
        // Validate password repeat (required)
        if (!formData.password_repeat) {
            isValid = false;
            errorMessage += 'Repeat Password is required.\n';
        }
        
        // Check if passwords match
        if (formData.password && formData.password_repeat && formData.password !== formData.password_repeat) {
            isValid = false;
            errorMessage += 'Passwords do not match.\n';
        }
        
        if (!isValid) {
            alert('Form Validation Failed:\n' + errorMessage);
        }
        
        return isValid;
    }
    
    async function rocketGeekSignupForm(event) {
        event.preventDefault();
        
        const formData = {
            first_name: document.getElementById('firstName').value,
            last_name: document.getElementById('lastName').value,
            email: document.getElementById('email').value,
            phone_number: document.getElementById('phoneNumber').value,
            zip_code: document.getElementById('zipCode').value,
            password: document.getElementById('passwordInput').value,
            password_repeat: document.getElementById('repeatPasswordInput').value
        };
        
        if (!validateForm(formData)) {
            return;
        }
        
        try {
            const response = await fetch('https://zpaufhsjvc.execute-api.us-east-1.amazonaws.com/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            const result = await response.json();
            if (response.ok) {
                alert('Registration successful!');
            } else {
                alert('Registration failed: ' + result.message);
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('Error submitting form: ' + error.message);
            
            if (error.response) {
                console.error("Response status:", error.response.status);
                console.error("Response body:", error.response.body);
            }
            else {
                console.error('Error had no response object:');
            }
        }
    }
});
