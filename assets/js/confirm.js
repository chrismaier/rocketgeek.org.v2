// confirm.js — Rocket Geek confirmation flow (no single-letter vars)

const TOKEN_STORAGE_KEYS = [
    'id_token', 'idToken', 'cognitoIdToken', 'RG_ID_TOKEN',
    'access_token', 'accessToken', 'cognitoAccessToken'
];

// Reuse site-wide userPool if present; otherwise fall back to settings in the page
const FALLBACK_POOL_DATA =
    (typeof window.userPool !== 'undefined' && window.userPool.clientId) ? null : {
        UserPoolId: 'us-east-1_clrYuNqI3',
        ClientId: '3u51gurg8r0ri4riq2isa8aq7h'
    };

function byId(id) { return document.getElementById(id); }
function logInfo(...args) { console.log('[confirm.js]', ...args); }

const domRefs = {
    statusWrapper: byId('verificationStatus'),
    emailVerifiedBanner: byId('emailVerifiedBanner'),
    phoneVerifiedBanner: byId('phoneVerifiedBanner'),
    verifiedEmailText: byId('verifiedEmailValue'),
    verifiedPhoneText: byId('verifiedPhoneValue'),
    
    emailLookupForm: byId('emailLookupForm'),
    emailLookupInput: byId('email'),
    emailLookupButton: byId('btnCheckEmail'),
    
    emailConfirmForm: byId('emailConfirmForm'),
    emailConfirmInput: byId('emailConfirm'),
    emailCodeInput: byId('emailCode'),
    emailConfirmButton: byId('btnConfirmEmail'),
    emailResendButton: byId('btnResendEmail'),
    
    phoneConfirmForm: byId('phoneConfirmForm'),
    phoneInput: byId('phone'),
    phoneCodeInput: byId('phoneCode'),
    phoneConfirmButton: byId('btnConfirmPhone'),
    phoneResendButton: byId('btnResendPhone')
};

function showElement(el) { if (el) el.style.display = 'block'; }
function hideElement(el) { if (el) el.style.display = 'none'; }
function setText(el, text) { if (el) el.textContent = text; }

function getStoredJwtToken() {
    for (const storageKey of TOKEN_STORAGE_KEYS) {
        const value = localStorage.getItem(storageKey) || sessionStorage.getItem(storageKey);
        if (value) return value;
    }
    try {
        const cookies = document.cookie.split(';').reduce((acc, cookiePart) => {
            const [key, value] = cookiePart.trim().split('=');
            if (key && value) acc[key] = decodeURIComponent(value);
            return acc;
        }, {});
        for (const storageKey of TOKEN_STORAGE_KEYS) {
            if (cookies[storageKey]) return cookies[storageKey];
        }
    } catch {}
    return null;
}

function base64UrlDecodeToString(input) {
    const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = normalized.length % 4;
    const padded = padLen ? normalized + '='.repeat(4 - padLen) : normalized;
    return atob(padded);
}

function parseJwtClaims(jwtToken) {
    try {
        const payloadPart = jwtToken.split('.')[1];
        return JSON.parse(base64UrlDecodeToString(payloadPart));
    } catch {
        return null;
    }
}

function getUserPool() {
    if (typeof window.userPool !== 'undefined') return window.userPool;
    if (!FALLBACK_POOL_DATA) return null;
    return new AmazonCognitoIdentity.CognitoUserPool(FALLBACK_POOL_DATA);
}

function cognitoUserForEmail(emailAddress) {
    const userPool = getUserPool();
    if (!userPool || !emailAddress) return null;
    return new AmazonCognitoIdentity.CognitoUser({ Username: emailAddress, Pool: userPool });
}

function showEmailLookupOnly() {
    showElement(domRefs.emailLookupForm);
    hideElement(domRefs.emailConfirmForm);
    hideElement(domRefs.phoneConfirmForm);
}

function showEmailVerified(emailAddress) {
    setText(domRefs.verifiedEmailText, emailAddress || '');
    showElement(domRefs.emailVerifiedBanner);
    showElement(domRefs.statusWrapper);
    hideElement(domRefs.emailLookupForm);
    hideElement(domRefs.emailConfirmForm);
}

function showPhoneVerified(phoneNumber) {
    setText(domRefs.verifiedPhoneText, phoneNumber || '');
    showElement(domRefs.phoneVerifiedBanner);
    showElement(domRefs.statusWrapper);
}

function showEmailConfirmForm(prefilledEmail) {
    if (domRefs.emailConfirmInput) domRefs.emailConfirmInput.value = prefilledEmail || '';
    hideElement(domRefs.emailLookupForm);
    showElement(domRefs.emailConfirmForm);
}

function showPhoneFormOnlyWhenJwtPresent() {
    const token = getStoredJwtToken();
    if (token) {
        showElement(domRefs.phoneConfirmForm);
    } else {
        hideElement(domRefs.phoneConfirmForm);
    }
}

function mapVerifyLambdaResponse(rawResponse, fallbackEmail) {
    // Do not force exists=false if field is missing. Infer conservatively.
    const existsField = (rawResponse && 'exists' in rawResponse) ? !!rawResponse.exists : undefined;
    const emailVerified = !!rawResponse?.email_verified;
    const phoneVerified = !!rawResponse?.phone_verified || !!rawResponse?.phone_number_verified;
    const obfuscatedEmail = rawResponse?.email || '';
    
    // If backend reports verified, treat user as existing regardless of exists flag.
    const inferredExists = (existsField !== undefined)
        ? existsField
        : (emailVerified || phoneVerified || !!obfuscatedEmail);
    
    return {
        inferredExists,
        emailVerified,
        phoneVerified,
        obfuscatedEmail,
        inputEmail: fallbackEmail || ''
    };
}

// Email lookup (unauthenticated): calls your /verify via window.verifyStatusFn(email)
domRefs.emailLookupForm && domRefs.emailLookupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const inputEmail = (domRefs.emailLookupInput?.value || '').trim().toLowerCase();
    if (!inputEmail) {
        alert('Enter your email address first.');
        return;
    }
    if (typeof window.verifyStatusFn !== 'function') {
        alert('Verification endpoint is not configured.');
        return;
    }
    
    try {
        logInfo('Lookup via Lambda', 'https://api.rocketgeek.org/verify', inputEmail);
        const apiResponse = await window.verifyStatusFn(inputEmail);
        logInfo('Verify result:', apiResponse);
        
        const mapped = mapVerifyLambdaResponse(apiResponse, inputEmail);
        
        if (mapped.emailVerified) {
            showEmailVerified(mapped.obfuscatedEmail || mapped.inputEmail);
            showPhoneFormOnlyWhenJwtPresent();
            return;
        }
        
        if (!mapped.inferredExists) {
            alert('No account found for that email. Please check the address or sign up.');
            showEmailLookupOnly();
            return;
        }
        
        showEmailConfirmForm(mapped.inputEmail);
        showPhoneFormOnlyWhenJwtPresent();
    } catch (error) {
        console.error('[confirm.js] Lookup error:', error);
        alert('Account lookup failed: ' + (error?.message || error));
        showEmailLookupOnly();
    }
});

// Email confirmation with code (ConfirmSignUp)
domRefs.emailConfirmForm && domRefs.emailConfirmForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const emailForConfirm = (domRefs.emailConfirmInput?.value || '').trim().toLowerCase();
    const emailCode = (domRefs.emailCodeInput?.value || '').trim();
    if (!emailForConfirm || !emailCode) {
        alert('Enter your confirmation code.');
        return;
    }
    
    const cognitoUser = cognitoUserForEmail(emailForConfirm);
    if (!cognitoUser) {
        alert('Unable to initialize user pool. Check configuration.');
        return;
    }
    
    cognitoUser.confirmRegistration(emailCode, true, (err, result) => {
        if (err) {
            console.error('[confirm.js] confirmRegistration error:', err);
            alert(`Email confirmation failed: ${err.message || err}`);
            return;
        }
        logInfo('Email confirmed:', result);
        showEmailVerified(emailForConfirm);
        hideElement(domRefs.phoneConfirmForm); // no JWT in this path
    });
});

// Resend email confirmation code (explicit action)
domRefs.emailResendButton && domRefs.emailResendButton.addEventListener('click', () => {
    const emailFromForm = (domRefs.emailConfirmInput?.value || domRefs.emailLookupInput?.value || '').trim().toLowerCase();
    if (!emailFromForm) {
        alert('Enter your email address first.');
        return;
    }
    const cognitoUser = cognitoUserForEmail(emailFromForm);
    if (!cognitoUser) {
        alert('Unable to initialize user pool. Check configuration.');
        return;
    }
    cognitoUser.resendConfirmationCode((err, result) => {
        if (err) {
            console.error('[confirm.js] resend error:', err);
            alert(`Resend failed: ${err.message || err}`);
            return;
        }
        logInfo('Resend email result:', result);
        alert('A new confirmation code has been sent to your email.');
    });
});

// Phone flows remain JWT-gated; keep them hidden when no token
domRefs.phoneConfirmForm && domRefs.phoneConfirmForm.addEventListener('submit', (event) => {
    event.preventDefault();
    alert('Login is required to confirm your phone number.');
});

domRefs.phoneResendButton && domRefs.phoneResendButton.addEventListener('click', () => {
    alert('Login is required to resend the SMS code.');
});

// Initialization: unauthenticated defaults, show phone only if JWT exists
document.addEventListener('DOMContentLoaded', () => {
    try {
        const jwtToken = getStoredJwtToken();
        if (!jwtToken) {
            logInfo('No JWT detected: showing email lookup only.');
            showEmailLookupOnly();
            return;
        }
        
        const claims = parseJwtClaims(jwtToken) || {};
        logInfo('JWT claims detected:', claims);
        
        if (claims.email_verified && claims.email) {
            showEmailVerified(claims.email);
        } else {
            if (domRefs.emailConfirmInput) domRefs.emailConfirmInput.value = claims.email || '';
            hideElement(domRefs.emailLookupForm);
            showElement(domRefs.emailConfirmForm);
        }
        
        if (claims.phone_number_verified && claims.phone_number) {
            showPhoneVerified(claims.phone_number);
            hideElement(domRefs.phoneConfirmForm);
        } else {
            if (domRefs.phoneInput) domRefs.phoneInput.value = claims.phone_number || '';
            showElement(domRefs.phoneConfirmForm);
        }
    } catch (error) {
        console.error('[confirm.js] Initialization error:', error);
        showEmailLookupOnly();
    }
});
