/* START: config */
const VERIFY_STATUS_URL = 'https://api.rocketgeek.org/verify-status'; // <-- set to your existing Lambda route
const TOKEN_KEYS = [
    'id_token','idToken','cognitoIdToken','RG_ID_TOKEN',
    'access_token','accessToken','cognitoAccessToken'
];
// Reuse global userPool if already defined; otherwise set your pool IDs below if you need email confirm/resend from browser
const LOCAL_POOL_DATA =
    (typeof window.userPool !== 'undefined' && window.userPool.clientId) ? null : {
        UserPoolId: 'us-east-1_clrYuNqI3',
        ClientId: '3u51gurg8r0ri4riq2isa8aq7h'
    };
/* END: config */

/* START: helpers */
function $(id){ return document.getElementById(id); }
function log(...a){ console.log('[confirm.js]', ...a); }

function getStoredToken(){
    for(const k of TOKEN_KEYS){
        const v = localStorage.getItem(k) || sessionStorage.getItem(k);
        if(v) return v;
    }
    try{
        const cookies = document.cookie.split(';').reduce((m,c)=>{
            const [k,v] = c.trim().split('=');
            if(k && v) m[k] = decodeURIComponent(v);
            return m;
        },{});
        for(const k of TOKEN_KEYS){ if(cookies[k]) return cookies[k]; }
    }catch{}
    return null;
}

function base64UrlDecode(s){
    s = s.replace(/-/g,'+').replace(/_/g,'/');
    const pad = s.length % 4; if(pad) s += '='.repeat(4-pad);
    return atob(s);
}
function parseJwt(t){
    try{ return JSON.parse(base64UrlDecode(t.split('.')[1])); }
    catch(e){ log('parseJwt error', e); return null; }
}

function getUserPool(){
    if(typeof window.userPool !== 'undefined') return window.userPool;
    if(!LOCAL_POOL_DATA) return null;
    return new AmazonCognitoIdentity.CognitoUserPool(LOCAL_POOL_DATA);
}
function cognitoUserByEmail(email){
    const pool = getUserPool();
    if(!pool || !email) return null;
    return new AmazonCognitoIdentity.CognitoUser({ Username: email, Pool: pool });
}
/* END: helpers */

/* START: dom refs */
const dom = {
    statusWrap: $('verificationStatus'),
    emailBanner: $('emailVerifiedBanner'),
    phoneBanner: $('phoneVerifiedBanner'),
    verifiedEmailValue: $('verifiedEmailValue'),
    verifiedPhoneValue: $('verifiedPhoneValue'),
    
    emailLookupForm: $('emailLookupForm'),
    emailInput: $('email'),
    btnCheckEmail: $('btnCheckEmail'),
    
    emailConfirmForm: $('emailConfirmForm'),
    emailConfirm: $('emailConfirm'),
    emailCode: $('emailCode'),
    btnConfirmEmail: $('btnConfirmEmail'),
    btnResendEmail: $('btnResendEmail'),
    
    phoneConfirmForm: $('phoneConfirmForm'),
    phone: $('phone'),
    phoneCode: $('phoneCode'),
    btnConfirmPhone: $('btnConfirmPhone'),
    btnResendPhone: $('btnResendPhone'),
};
/* END: dom refs */

/* START: ui helpers */
function show(el){ if(el) el.style.display = 'block'; }
function hide(el){ if(el) el.style.display = 'none'; }
function setText(el, txt){ if(el) el.textContent = txt; }

function showEmailLookupOnly(){
    show(dom.emailLookupForm);
    hide(dom.emailConfirmForm);
    hide(dom.phoneConfirmForm);
}
function showEmailConfirm(email){
    if(dom.emailConfirm) dom.emailConfirm.value = email || '';
    hide(dom.emailLookupForm);
    show(dom.emailConfirmForm);
}
function showEmailVerifiedBanner(email){
    setText(dom.verifiedEmailValue, email || '');
    show(dom.emailBanner);
    show(dom.statusWrap);
    hide(dom.emailLookupForm);
    hide(dom.emailConfirmForm);
}
function showPhoneVerifiedBanner(phone){
    setText(dom.verifiedPhoneValue, phone || '');
    show(dom.phoneBanner);
    show(dom.statusWrap);
}
function showPhoneFormWithJwt(){
    show(dom.phoneConfirmForm);
}
function hidePhoneAll(){
    hide(dom.phoneConfirmForm);
}
/* END: ui helpers */

/* START: network */
async function postJson(url, bodyObj){
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type':'application/json'
        },
        body: JSON.stringify(bodyObj),
        credentials: 'include' // if your API needs cookies; safe to keep
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch(e){ /* leave data null */ }
    if(!res.ok){
        const msg = data && (data.error || data.message) ? (data.error || data.message) : text || `HTTP ${res.status}`;
        const err = new Error(msg);
        err.status = res.status;
        err.payload = data;
        throw err;
    }
    return data;
}
/* END: network */

/* START: mapping from your Lambda (adjust here if schema differs) */
function mapVerifyResponse(api){
    // Expected fields: exists, email_verified, phone_number_verified, email, phone_number
    // Adjust these mappings if your Lambda uses different keys.
    return {
        exists: !!api?.exists,
        email: api?.email || '',
        phone_number: api?.phone_number || '',
        email_verified: !!api?.email_verified,
        phone_number_verified: !!api?.phone_number_verified
    };
}
/* END: mapping */

/* START: main flows */

// Email lookup: call your verification Lambda; do NOT send a code here
dom.emailLookupForm && dom.emailLookupForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const email = (dom.emailInput?.value || '').trim();
    if(!email) return alert('Enter your email address first.');
    
    try{
        log('Lookup via Lambda', VERIFY_STATUS_URL, email);
        const raw = await postJson(VERIFY_STATUS_URL, { email });
        const v = mapVerifyResponse(raw);
        log('Verify result:', v);
        
        if(!v.exists){
            alert('No account found for that email. Please check the address or sign up.');
            showEmailLookupOnly();
            return;
        }
        
        if(v.email_verified){
            showEmailVerifiedBanner(v.email || email);
            // No JWT here; phone UI stays hidden
            hidePhoneAll();
            return;
        }
        
        // Not verified yet: reveal email confirm form (code entry + resend)
        showEmailConfirm(v.email || email);
        hidePhoneAll(); // still hidden without JWT
        
    }catch(err){
        log('Verify Lambda error:', err);
        alert(`Account lookup failed: ${err.message || err}`);
        showEmailLookupOnly();
    }
});

// Confirm email using code (standard confirmRegistration)
dom.emailConfirmForm && dom.emailConfirmForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const email = (dom.emailConfirm?.value || '').trim();
    const code  = (dom.emailCode?.value || '').trim();
    if(!email || !code) return alert('Enter your confirmation code.');
    
    const user = cognitoUserByEmail(email);
    if(!user) return alert('Unable to create Cognito user. Check pool config.');
    
    log('confirmRegistration for', email);
    user.confirmRegistration(code, true, (err, result)=>{
        if(err){
            log('confirmRegistration error:', err);
            alert(`Email confirmation failed: ${err.message || err}`);
            return;
        }
        log('Email confirmed:', result);
        showEmailVerifiedBanner(email);
        hidePhoneAll();
    });
});

// Resend email code (explicit user action only)
dom.btnResendEmail && dom.btnResendEmail.addEventListener('click', ()=>{
    const email = (dom.emailConfirm?.value || dom.emailInput?.value || '').trim();
    if(!email) return alert('Enter your email address first.');
    const user = cognitoUserByEmail(email);
    if(!user) return alert('Unable to create Cognito user. Check pool config.');
    
    log('Resend email to', email);
    user.resendConfirmationCode((err, result)=>{
        if(err){
            log('Resend email error:', err);
            alert(`Resend failed: ${err.message || err}`);
            return;
        }
        log('Resend email result:', result);
        alert('A new confirmation code has been sent to your email.');
    });
});

// Phone confirm/resend remain JWT-gated; hide when no JWT
dom.phoneConfirmForm && dom.phoneConfirmForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    alert('Login is required to confirm your phone number.');
});
dom.btnResendPhone && dom.btnResendPhone.addEventListener('click', ()=>{
    alert('Login is required to resend the SMS code.');
});
/* END: main flows */

/* START: init */
document.addEventListener('DOMContentLoaded', ()=>{
    try{
        const token = getStoredToken();
        if(!token){
            log('No JWT: show email lookup only; keep phone hidden.');
            showEmailLookupOnly();
            return;
        }
        
        // With JWT: honor claims for banners and phone UI
        const c = parseJwt(token) || {};
        log('JWT claims:', c);
        
        // Email
        if(c.email_verified && c.email){
            showEmailVerifiedBanner(c.email);
        }else{
            if(dom.emailConfirm) dom.emailConfirm.value = c.email || '';
            hide(dom.emailLookupForm);
            show(dom.emailConfirmForm);
        }
        
        // Phone
        if(c.phone_number_verified && c.phone_number){
            showPhoneVerifiedBanner(c.phone_number);
            hide(dom.phoneConfirmForm);
        }else{
            if(dom.phone) dom.phone.value = c.phone_number || '';
            showPhoneFormWithJwt();
        }
        
    }catch(e){
        log('Initialization error:', e);
        showEmailLookupOnly();
    }
});
/* END: init */
