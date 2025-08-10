/* -------------------------------------------------
   File: confirm.js
   Page: confirm.html
   Purpose: Front-end workflow for confirmation page.
   Scope: Do NOT change the form or backend Lambdas.
          Orchestrate the page logic only.
   Workflow:
     1) On DOM ready, evaluate JWT and branch:
        - Has JWT: parse email, auto-check Cognito existence.
          - If account not found -> redirect to signup.
        - No JWT: prompt for email; on submit, run the same check.
     2) Paths reconverge (we have an email that exists in Cognito):
        - Fetch verification state for email and phone.
        - If email verified -> show email verified banner; else show email verify form.
        - If phone verified -> show phone verified banner; else show phone verify form.
     3) If BOTH email and phone are verified:
        - Check the S3 directory bucket for the user's profile directory via backend.
        - If profile directory (or profile.json) does not exist -> create it with default values.
   Design:
     - Small helper functions; verbose console logs; meaningful names.
     - No lines of comments that are only decoration characters.
   ------------------------------------------------- */

/* Config */
const API_BASE = window.RG_API_BASE || 'https://api.rocketgeek.org';

const RGConfirmConfig = {
  verifyApiUrl:     `${API_BASE}/verify`,
  getProfileUrl:    `${API_BASE}/get-profile`,
  createProfileUrl: `${API_BASE}/create-profile`,
  signupUrl:        '/register.html',
  requestTimeoutMs: 12000,
  
  selectors: {
    // email lookup (no-JWT path)
    emailSectionWrapper: '#emailLookupForm',
    emailInput:          '#email',
    emailSubmitButton:   '#btnCheckEmail',
    
    // verification UI sections
    verificationStatus:    '#verificationStatus',
    emailVerificationForm: '#emailConfirmForm',
    emailVerifiedBanner:   '#emailVerifiedBanner',
    phoneVerificationForm: '#phoneConfirmForm',
    phoneVerifiedBanner:   '#phoneVerifiedBanner',
    
    // login UI selectors
    loginForm: '#loginForm',
    loginEmail: '#loginEmail',
    loginPassword: '#loginPassword',
    loginButton: '#btnLogin'
    
  }
};

/* Logging helpers */
function rgLogInfo(msg, data){ try{ data!==undefined?console.log('[confirm.js] INFO:', msg, data):console.log('[confirm.js] INFO:', msg);}catch(_){} }
function rgLogWarn(msg, data){ try{ data!==undefined?console.warn('[confirm.js] WARN:', msg, data):console.warn('[confirm.js] WARN:', msg);}catch(_){} }
function rgLogError(msg, data){ try{ data!==undefined?console.error('[confirm.js] ERROR:', msg, data):console.error('[confirm.js] ERROR:', msg);}catch(_){} }

/* Validators */
function isString(v){ return typeof v==='string'||v instanceof String; }
function isNonEmptyString(v){ return isString(v)&&v.trim().length>0; }
function isLikelyEmail(v){ if(!isNonEmptyString(v)) return false; return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); }

/* DOM helpers */
function qs(sel){ const el=document.querySelector(sel); if(!el) rgLogWarn('Selector not found:', sel); return el; }

/* Only toggle Bootstrap's d-none to avoid layout break */
function setVisible(selOrEl, visible){
  const el = typeof selOrEl === 'string' ? qs(selOrEl) : selOrEl;
  if (!el) return;
  if (visible) el.classList.remove('d-none'); else el.classList.add('d-none');
}

/* One-time cleanup of inline display:none so classes control visibility */
function unhideBaseSectionsOnce(){
  const ids = [
    'verificationStatus',
    'emailVerifiedBanner',
    'phoneVerifiedBanner',
    'emailConfirmForm',
    'phoneConfirmForm',
    'emailLookupForm'
  ];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.style && typeof el.style.removeProperty === 'function') {
      el.style.removeProperty('display');   // remove inline display:none
    } else {
      el.style.display = '';
    }
    el.classList.add('d-none');             // baseline hidden via class
  });
  rgLogInfo('Ran unhideBaseSectionsOnce to clear inline display:none');
}

/* JWT helpers */
function getIdTokenFromLocalStorage(){
  try{
    const keys = Object.keys(localStorage).filter(k=>k.includes('CognitoIdentityServiceProvider')&&k.endsWith('.idToken'));
    if(keys.length===0) return null;
    let best=null, len=-1;
    keys.forEach(k=>{ const v=localStorage.getItem(k)||''; if(v.length>len){ len=v.length; best=v; } });
    return best||null;
  }catch(e){ rgLogWarn('Failed to read idToken from localStorage', e); return null; }
}
function parseJwtPayload(jwt){
  if(!isNonEmptyString(jwt)||jwt.split('.').length!==3) return null;
  try{
    const b = jwt.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
    const pad = b.length%4? '='.repeat(4-(b.length%4)) : '';
    return JSON.parse(atob(b+pad));
  }catch(e){ rgLogWarn('JWT parse failed', e); return null; }
}
function extractEmailFromJwt(jwt){
  const p=parseJwtPayload(jwt); if(!p) return null;
  const keys=['email','custom:email','preferred_username'];
  for(const k of keys){ if(isLikelyEmail(p[k])) return p[k]; }
  return null;
}

/* HTTP helper */
async function postJson(url, body, timeoutMs, authToken){
  const controller=new AbortController();
  const t=setTimeout(()=>controller.abort(), timeoutMs);
  try{
    const headers={'Content-Type':'application/json'};
    if(isNonEmptyString(authToken)) headers['Authorization']=authToken.startsWith('Bearer ')?authToken:`Bearer ${authToken}`;
    const res=await fetch(url, {method:'POST', headers, mode:'cors', body:JSON.stringify(body||{}), signal:controller.signal});
    const text=await res.text();
    let json=null; try{ json=text?JSON.parse(text):null; }catch(_){}
    return {ok:res.ok, status:res.status, json, text};
  }finally{ clearTimeout(t); }
}

// --- BEGIN PATCH: verify API helpers (place right below postJson) ---

function getAuthTokenAtCallTime(){
  // Prefer a token we stored after a successful login; fallback to localStorage Cognito token
  if (window.rgAuth && isNonEmptyString(window.rgAuth.idToken)) return window.rgAuth.idToken;
  return getIdTokenFromLocalStorage();
}


async function postVerify(payload, includeAuth=false){
  const auth = includeAuth ? getAuthTokenAtCallTime() : undefined;
  rgLogInfo('POST /verify payload (masked)', {
    action: payload.action,
    channel: payload.channel,
    hasCode: !!payload.code,
    email: payload.email ? '<present>' : undefined,
    phone: payload.phone ? '<present>' : undefined
  });
  const resp = await postJson(RGConfirmConfig.verifyApiUrl, payload, RGConfirmConfig.requestTimeoutMs, auth);
  rgLogInfo('Verify API response', { status: resp.status, ok: resp.ok, body: resp.json || resp.text });
  if (resp && resp.json) {
    const dbg = {
      status: resp.status,
      ok: resp.ok,
      confirmed: resp.json.confirmed,
      sent: resp.json.sent,
      throttled: resp.json.throttled,
      retry_after_s: resp.json.retry_after_s,
      email_verified: resp.json.email_verified,
      phone_verified: resp.json.phone_verified,
      error: resp.json.error
    };
    rgLogInfo('Verify API parsed outcome', dbg);
  }
  
  return resp;
}



// Resend email code
async function sendEmailCode(email){
  const payload = {
    action: 'send',
    channel: 'email',
    email: email,
    identifier: email,
    username: email,
    user: email
  };
  return postVerify(payload, /*includeAuth*/ false);
}

// Confirm email code
async function confirmEmailCode(email, code){
  const payload = {
    action: 'confirm',
    channel: 'email',
    email: email,
    identifier: email,
    code: code
  };
  return postVerify(payload, /*includeAuth*/ false);
}

// Resend phone (SMS) code
async function sendPhoneCode(phone){
  const payload = {
    action: 'send',
    channel: 'sms',
    phone: phone,
    identifier: phone
  };
  return postVerify(payload, /*includeAuth*/ true); // SMS send often requires auth
}

// Confirm phone (SMS) code
async function confirmPhoneCode(phone, code){
  const payload = {
    action: 'confirm',
    channel: 'sms',
    phone: phone,
    identifier: phone,
    code: code
  };
  return postVerify(payload, /*includeAuth*/ true); // most confirm endpoints prefer auth
}

// --- END PATCH ---


/* Verify API: preflight/status */
async function fetchAccountStatus(email){
  const payload = {
    action: 'preflight',
    channel: 'email',
    // send a superset to satisfy any backend shape
    identifier: email,
    email: email,
    username: email,
    user: email
  };
  rgLogInfo('Calling /verify preflight', {identifier:'<redacted>'});
  try{
    rgLogInfo('Preflight request payload', { emailMasked: String(email).replace(/^(.).+(@.+)$/, (_, a, b) => `${a}***${b}`) });
    const resp=await postJson(RGConfirmConfig.verifyApiUrl, payload, RGConfirmConfig.requestTimeoutMs);
    rgLogInfo('Preflight response', {status:resp.status, ok:resp.ok, body:resp.json||resp.text});
    return parseStatusResponse(resp);
  }catch(e){ rgLogError('Preflight failed', e); return {exists:false, emailVerified:false, phoneVerified:false, phoneOnFile:false}; }
}

/* Parse server response to a uniform shape */
function parseStatusResponse(resp){
  const out={ exists:false, emailVerified:false, phoneVerified:false, phoneOnFile:false };
  if(!resp||!resp.json) return out;
  const j=resp.json;
  
  if(typeof j.exists==='boolean') out.exists=j.exists;
  if(typeof j.email_verified==='boolean') out.emailVerified=j.email_verified;
  if(typeof j.phone_verified==='boolean') out.phoneVerified=j.phone_verified;
  if(typeof j.phone_on_file==='boolean') out.phoneOnFile=j.phone_on_file;
  
  if(j.user&&typeof j.user==='object'){
    const u=j.user;
    if(typeof u.exists==='boolean') out.exists=u.exists;
    if(typeof u.email_verified==='boolean') out.emailVerified=u.email_verified;
    if(typeof u.phone_verified==='boolean') out.phoneVerified=u.phone_verified;
    if(typeof u.phone_on_file==='boolean') out.phoneOnFile=u.phone_on_file;
    if(isNonEmptyString(u.phone_number)) out.phoneOnFile=true;
  }
  
  if(j.attributes&&typeof j.attributes==='object'){
    const a=j.attributes;
    if(typeof a.email_verified==='boolean') out.emailVerified=a.email_verified;
    if(typeof a.phone_number_verified==='boolean') out.phoneVerified=a.phone_number_verified;
    if(isNonEmptyString(a.phone_number)) out.phoneOnFile=true;
  }
  return out;
}

/* Profile directory orchestration */
async function ensureProfileExists(authToken){
  try{
    rgLogInfo('Checking for existing profile via /get-profile');
    const resp=await postJson(RGConfirmConfig.getProfileUrl, {}, RGConfirmConfig.requestTimeoutMs, authToken);
    if(resp.ok){
      rgLogInfo('Profile exists or was returned successfully');
      return true;
    }
    if(resp.json && (resp.json.not_found===true || resp.json.error==='profile_not_found')){
      rgLogInfo('Profile not found per JSON signal; creating default profile');
      return await createDefaultProfile(authToken);
    }
    if(resp.status===404){
      rgLogInfo('Profile not found (404); creating default profile');
      return await createDefaultProfile(authToken);
    }
    rgLogWarn('Unexpected get-profile response; not creating profile', {status:resp.status, body:resp.json||resp.text});
    return false;
  }catch(e){
    rgLogError('Error during profile existence check', e);
    return false;
  }
}

async function createDefaultProfile(authToken){
  const payload={ initialize:true };
  try{
    rgLogInfo('Creating default profile via /create-profile');
    const resp=await postJson(RGConfirmConfig.createProfileUrl, payload, RGConfirmConfig.requestTimeoutMs, authToken);
    rgLogInfo('Create-profile response', {status:resp.status, ok:resp.ok, body:resp.json||resp.text});
    return !!resp.ok;
  }catch(e){
    rgLogError('Create-profile call failed', e);
    return false;
  }
}

/* UI application */
function applyVerificationUi(status, currentEmail) {
  const sel = RGConfirmConfig.selectors;
  
  const emailToShow =
      currentEmail ||
      (window.rgConfirmState && window.rgConfirmState.email) ||
      '';
  
  const willShowAnyBanner = !!status.emailVerified || !!status.phoneVerified;
  setVisible(sel.verificationStatus, willShowAnyBanner);
  
  // EMAIL
  if (status.emailVerified) {
    setVisible(sel.emailVerifiedBanner, true);
    setVisible(sel.emailVerificationForm, false);
    const emailValueEl = document.getElementById('verifiedEmailValue');
    if (emailValueEl && emailToShow) emailValueEl.textContent = emailToShow;
  } else {
    setVisible(sel.emailVerifiedBanner, false);
    setVisible(sel.emailVerificationForm, true);
    const emailConfirmInput = document.getElementById('emailConfirm');
    if (emailConfirmInput && emailToShow) emailConfirmInput.value = emailToShow;
  }
  
  // PHONE
  if (status.phoneVerified) {
    setVisible(sel.phoneVerifiedBanner, true);
    setVisible(sel.phoneVerificationForm, false);
    const phoneValueEl = document.getElementById('verifiedPhoneValue');
    if (phoneValueEl && window.rgConfirmState?.status?.phone_number) {
      phoneValueEl.textContent = window.rgConfirmState.status.phone_number;
    }
  } else {
    setVisible(sel.phoneVerifiedBanner, false);
    setVisible(sel.phoneVerificationForm, true);
  }
  
  // once the account exists, hide the lookup form
  if (sel.emailSectionWrapper) {
    setVisible(sel.emailSectionWrapper, false);
  }
}

/* Entry branches */
async function handleHasJwtPath(){
  const token=getIdTokenFromLocalStorage();
  if(!isNonEmptyString(token)){ return false; } // not handled
  const email=extractEmailFromJwt(token);
  rgLogInfo('JWT present; extracted email', {email: isNonEmptyString(email)? '<present>':'<missing>'});
  if(!isLikelyEmail(email)){ return false; }
  
  const status=await fetchAccountStatus(email);
  if(!status.exists){
    rgLogInfo('Account does not exist; redirecting to signup');
    // window.location.href=RGConfirmConfig.signupUrl;
    return true;
  }
  
  setVisible(RGConfirmConfig.selectors.emailSectionWrapper, false);
  applyVerificationUi(status, email);
  
  if(status.emailVerified && status.phoneVerified){
    const ok = await ensureProfileExists(token);
    rgLogInfo('Profile ensure result', {ok});
  }
  
  window.rgConfirmState={ email, status };
  return true;
}

function wireNoJwtEmailHandler(){
  const sel=RGConfirmConfig.selectors;
  const emailInput=qs(sel.emailInput);
  const emailBtn=qs(sel.emailSubmitButton);
  
  if(!emailInput||!emailBtn){ rgLogWarn('No-JWT controls missing'); return; }
  
  const onSubmit=async (evt)=>{
    try{
      if(evt && typeof evt.preventDefault==='function') evt.preventDefault();
      const email=(emailInput.value||'').trim();
      if(!isLikelyEmail(email)){ rgLogWarn('Invalid email entered'); emailInput.focus(); return; }
      
      const status=await fetchAccountStatus(email);
      if(!status.exists){
        rgLogInfo('Account does not exist (no-JWT path); redirecting to signup');
        // window.location.href=RGConfirmConfig.signupUrl;
        return;
      }
      
      applyVerificationUi(status, email);
      
      if(status.emailVerified && status.phoneVerified){
        rgLogInfo('Both verified but no JWT token available; skipping profile ensure.');
      }
      
      window.rgConfirmState={ email, status };
    }catch(e){ rgLogError('Error in no-JWT submit handler', e); }
  };
  
  
  // Attempt resource-owner style login via your backend.
// Expect the backend to verify credentials with Cognito and return id_token/access_token/refresh_token.
// If you use Cognito Hosted UI instead, replace this with a redirect to the Hosted UI.
  async function loginWithEmailPassword(email, password){
    const url = `${API_BASE}/auth/login`; // <-- adjust if your login endpoint differs
    const payload = { email, password };
    rgLogInfo('Login attempt (masked)', { email: '<present>', hasPassword: !!password });
    
    const resp = await postJson(url, payload, RGConfirmConfig.requestTimeoutMs);
    rgLogInfo('Login response', { status: resp.status, ok: resp.ok, body: resp.json || resp.text });
    
    if (!resp.ok || !resp.json) return null;
    
    // Accept common token shapes; adapt if your backend uses different keys
    const idToken = resp.json.id_token || resp.json.idToken || resp.json.token || '';
    const accessToken = resp.json.access_token || resp.json.accessToken || '';
    const refreshToken = resp.json.refresh_token || resp.json.refreshToken || '';
    
    if (!isNonEmptyString(idToken)) return null;
    
    // Keep tokens in memory; rest of code can pick it up via getAuthTokenAtCallTime()
    window.rgAuth = { idToken, accessToken, refreshToken, email };
    
    // Optional: also stash in localStorage if you want subsequent page loads to see it
    // localStorage.setItem('RG_idToken', idToken);
    
    return window.rgAuth;
  }
  
  function wireLoginForm(){
    const sel = RGConfirmConfig.selectors;
    const form = document.querySelector(sel.loginForm);
    if (!form) return;
    
    form.addEventListener('submit', async function(evt){
      evt.preventDefault();
      try{
        const emailEl = document.querySelector(sel.loginEmail);
        const passEl = document.querySelector(sel.loginPassword);
        const email = (emailEl && emailEl.value || '').trim();
        const password = passEl ? String(passEl.value || '') : '';
        
        if (!isLikelyEmail(email)) {
          rgLogWarn('Login submit: invalid email.');
          emailEl && emailEl.focus();
          return;
        }
        if (!password) {
          rgLogWarn('Login submit: empty password.');
          passEl && passEl.focus();
          return;
        }
        
        const auth = await loginWithEmailPassword(email, password);
        if (!auth) {
          rgLogWarn('Login failed.');
          return;
        }
        
        // After login, proceed exactly like the JWT path:
        const status = await fetchAccountStatus(email);
        if (!status.exists) {
          rgLogInfo('Post-login preflight: account does not exist; redirecting to signup');
          // window.location.href = RGConfirmConfig.signupUrl;
          return;
        }
        
        // Hide login + lookup; apply UI; set canonical state
        setVisible(sel.loginForm, false);
        setVisible(sel.emailSectionWrapper, false);
        
        window.rgConfirmState = { email, status };
        applyVerificationUi(status, email);
        
        // If both verified, ensure profile
        if (status.emailVerified && status.phoneVerified) {
          const ensured = await ensureProfileExists(getAuthTokenAtCallTime());
          rgLogInfo('Profile ensure after login', { ok: ensured });
        }
      }catch(e){
        rgLogError('Login submit handler error', e);
      }
    });
  }
  
  
  
  const form=emailBtn.closest('form');
  if(form){ form.addEventListener('submit', onSubmit); }
  else { emailBtn.addEventListener('click', onSubmit); }
}

// --- BEGIN PATCH: working handlers for confirm/resend buttons ---
function wireVerificationForms(){
  // EMAIL CONFIRM FORM
  const emailConfirmForm = document.getElementById('emailConfirmForm');
  if (emailConfirmForm) {
    emailConfirmForm.addEventListener('submit', async function(evt){
      evt.preventDefault();
      try {
        // Prefer explicitly typed email; fall back to state
        const emailInputConfirm = document.getElementById('emailConfirm');
        const emailFromField = emailInputConfirm && emailInputConfirm.value ? emailInputConfirm.value.trim() : '';
        const email = isLikelyEmail(emailFromField) ? emailFromField
            : (window.rgConfirmState && window.rgConfirmState.email) || '';
        
        const codeInput = document.getElementById('emailCode');
        const code = codeInput ? String(codeInput.value || '').trim() : '';
        
        if (!isLikelyEmail(email)) {
          rgLogWarn('Confirm email clicked with invalid or missing email.');
          return;
        }
        if (!code) {
          rgLogWarn('Confirm email clicked with empty code.');
          return;
        }
        
        const resp = await confirmEmailCode(email, code);
        const ok = resp.ok && resp.json && resp.json.confirmed === true || (resp.json && resp.json.email_verified === true);
        if (ok) {
          rgLogInfo('Email confirmation succeeded.');
          // Update local status & UI
          if (!window.rgConfirmState) window.rgConfirmState = {};
          window.rgConfirmState.email = email;
          window.rgConfirmState.status = Object.assign({}, window.rgConfirmState.status || {}, { emailVerified: true });
          applyVerificationUi(window.rgConfirmState.status, email);
          
          // If phone is also verified now, ensure profile
          const token = getAuthTokenAtCallTime();
          const bothVerified = !!window.rgConfirmState.status.emailVerified && !!window.rgConfirmState.status.phoneVerified;
          if (bothVerified && token) {
            const ensured = await ensureProfileExists(token);
            rgLogInfo('Profile ensure after email confirm', { ok: ensured });
          }
        } else {
          rgLogWarn('Email confirmation failed.', resp.json || resp.text);
        }
      } catch (err) {
        rgLogError('Email confirm handler error', err);
      }
    });
  }
  
  // EMAIL RESEND
  const btnResendEmail = document.getElementById('btnResendEmail');
  if (btnResendEmail) {
    btnResendEmail.addEventListener('click', async function(){
      try {
        const emailInputConfirm = document.getElementById('emailConfirm');
        const emailFromField = emailInputConfirm && emailInputConfirm.value ? emailInputConfirm.value.trim() : '';
        const email = isLikelyEmail(emailFromField) ? emailFromField
            : (window.rgConfirmState && window.rgConfirmState.email) || '';
        
        if (!isLikelyEmail(email)) {
          rgLogWarn('Resend email clicked with invalid or missing email.');
          return;
        }
        const resp = await sendEmailCode(email);
        if (resp.ok) {
          rgLogInfo('Resent email verification code successfully.');
        } else {
          rgLogWarn('Failed to resend email code.', resp.json || resp.text);
        }
      } catch (err) {
        rgLogError('Resend email handler error', err);
      }
    });
  }
  
  // PHONE CONFIRM FORM
  const phoneConfirmForm = document.getElementById('phoneConfirmForm');
  if (phoneConfirmForm) {
    phoneConfirmForm.addEventListener('submit', async function(evt){
      evt.preventDefault();
      try {
        const phoneInput = document.getElementById('phone');
        const phone = phoneInput ? String(phoneInput.value || '').trim() : '';
        const codeInput = document.getElementById('phoneCode');
        const code = codeInput ? String(codeInput.value || '').trim() : '';
        
        if (!phone) { rgLogWarn('Confirm phone clicked with empty phone.'); return; }
        if (!code)  { rgLogWarn('Confirm phone clicked with empty code.');  return; }
        
        const resp = await confirmPhoneCode(phone, code);
        const ok = resp.ok && resp.json && (resp.json.confirmed === true || resp.json.phone_verified === true);
        if (ok) {
          rgLogInfo('Phone confirmation succeeded.');
          if (!window.rgConfirmState) window.rgConfirmState = {};
          window.rgConfirmState.status = Object.assign({}, window.rgConfirmState.status || {}, { phoneVerified: true });
          applyVerificationUi(window.rgConfirmState.status, window.rgConfirmState.email);
          
          // If email also verified now, ensure profile
          const token = getAuthTokenAtCallTime();
          const bothVerified = !!window.rgConfirmState.status.emailVerified && !!window.rgConfirmState.status.phoneVerified;
          if (bothVerified && token) {
            const ensured = await ensureProfileExists(token);
            rgLogInfo('Profile ensure after phone confirm', { ok: ensured });
          }
        } else {
          rgLogWarn('Phone confirmation failed.', resp.json || resp.text);
        }
      } catch (err) {
        rgLogError('Phone confirm handler error', err);
      }
    });
  }
  
  // PHONE RESEND
  const btnResendPhone = document.getElementById('btnResendPhone');
  if (btnResendPhone) {
    btnResendPhone.addEventListener('click', async function(){
      try {
        const phoneInput = document.getElementById('phone');
        const phone = phoneInput ? String(phoneInput.value || '').trim() : '';
        if (!phone) { rgLogWarn('Resend phone clicked with empty phone.'); return; }
        
        const resp = await sendPhoneCode(phone);
        if (resp.ok) {
          rgLogInfo('Resent SMS verification code successfully.');
        } else {
          rgLogWarn('Failed to resend SMS code.', resp.json || resp.text);
        }
      } catch (err) {
        rgLogError('Resend phone handler error', err);
      }
    });
  }
}
// --- END PATCH ---


/* Init */
async function initConfirm(){
  rgLogInfo('Initializing workflow on confirm.html');
  
  // Try JWT path first
  const handled = await handleHasJwtPath();
  if(handled){ return; }
  
  
// No usable JWT; show LOGIN instead of email lookup
  setVisible(RGConfirmConfig.selectors.emailSectionWrapper, false);
  setVisible(RGConfirmConfig.selectors.loginForm, true);
  wireLoginForm();
}

/* DOM ready */
document.addEventListener('DOMContentLoaded', function(){
  try{
    unhideBaseSectionsOnce();   // clear inline display:none first
    wireVerificationForms();    // prevent confirm forms from reloading the page
    initConfirm();
  }catch(e){
    rgLogError('Initialization failed', e);
  }
});

/* Export minimal debug surface */
window.RGConfirm={
  init:initConfirm,
  config:RGConfirmConfig,
  _ensureProfileExists:ensureProfileExists
};
