
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
// At the top of confirm.js
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
    verificationStatus: '#verificationStatus',   // <— add this line
    emailVerificationForm: '#emailConfirmForm',
    emailVerifiedBanner:   '#emailVerifiedBanner',
    phoneVerificationForm: '#phoneConfirmForm',
    phoneVerifiedBanner:   '#phoneVerifiedBanner'
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
function setVisible(selOrEl, visible){
  const el = typeof selOrEl==='string'? qs(selOrEl) : selOrEl;
  if(!el) return;
  const wrapper = el.closest('.mb-3, .form-group, .row, .col, .card, section') || el;
  try{
    if(visible){ wrapper.classList.remove('d-none'); wrapper.style.display=''; }
    else { wrapper.classList.add('d-none'); wrapper.style.display='none'; }
  }catch(e){ rgLogWarn('Visibility toggle failed', {e, el}); }
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

/* Verify API: preflight/status */
async function fetchAccountStatus(email){
  // old / incomplete list:  const payload={ action:'preflight', channel:'email', identifier:email };
  const payload = {
    action: 'preflight',
    channel: 'email',
    
    // send a superset to satisfy any backend shape
    identifier: email,          // what I used originally
    email: email,               // common expectation
    username: email,            // some backends use "username"
    user: email                 // belt & suspenders
  };
  rgLogInfo('Calling /verify preflight', {identifier:'<redacted>'});
  try{
    console.log("Current RGConfirmation.verifyApiUrl: " + RGConfirmConfig.verifyApiUrl);
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
  // Use /get-profile to check; on 404-like or explicit "not found" signal, call /create-profile
  try{
    rgLogInfo('Checking for existing profile via /get-profile');
    const resp=await postJson(RGConfirmConfig.getProfileUrl, {}, RGConfirmConfig.requestTimeoutMs, authToken);
    if(resp.ok){
      rgLogInfo('Profile exists or was returned successfully');
      return true;
    }
    // If backend uses a JSON "not found" pattern
    if(resp.json && (resp.json.not_found===true || resp.json.error==='profile_not_found')){
      rgLogInfo('Profile not found per JSON signal; creating default profile');
      return await createDefaultProfile(authToken);
    }
    // Fallback on HTTP status
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
  // Minimal default profile payload; backend will fill from JWT as needed
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
/*
function applyVerificationUi(status){
  const sel=RGConfirmConfig.selectors;
  if(status.emailVerified){ setVisible(sel.emailVerifiedBanner,true); setVisible(sel.emailVerificationForm,false); }
  else { setVisible(sel.emailVerifiedBanner,false); setVisible(sel.emailVerificationForm,true); }

  if(status.phoneVerified){ setVisible(sel.phoneVerifiedBanner,true); setVisible(sel.phoneVerificationForm,false); }
  else { setVisible(sel.phoneVerifiedBanner,false); setVisible(sel.phoneVerificationForm,true); }
}
*/

function applyVerificationUi(status, currentEmail) {
  const sel = RGConfirmConfig.selectors;
  
  // If any banner will be visible, unhide the container
  const willShowAnyBanner = !!status.emailVerified || !!status.phoneVerified;
  if (willShowAnyBanner) {
    setVisible(sel.verificationStatus, true);
  } else {
    setVisible(sel.verificationStatus, false);
  }
  
  // EMAIL
  if (status.emailVerified) {
    setVisible(sel.emailVerifiedBanner, true);
    setVisible(sel.emailVerificationForm, false);
    const emailValueEl = document.getElementById('verifiedEmailValue');
    if (emailValueEl && currentEmail) emailValueEl.textContent = currentEmail;
  } else {
    setVisible(sel.emailVerifiedBanner, false);
    setVisible(sel.emailVerificationForm, true);
    // If you want the email to carry into the confirm form’s read-only field:
    const emailConfirmInput = document.getElementById('emailConfirm');
    if (emailConfirmInput && currentEmail) emailConfirmInput.value = currentEmail;
  }
  
  // PHONE
  if (status.phoneVerified) {
    setVisible(sel.phoneVerifiedBanner, true);
    setVisible(sel.phoneVerificationForm, false);
    // If your API ever returns a phone string you want to show:
    const phoneValueEl = document.getElementById('verifiedPhoneValue');
    if (phoneValueEl && window.rgConfirmState?.status?.phone_number) {
      phoneValueEl.textContent = window.rgConfirmState.status.phone_number;
    }
  } else {
    setVisible(sel.phoneVerifiedBanner, false);
    setVisible(sel.phoneVerificationForm, true);
  }
  
  // Hide the email lookup form when we already know the account exists
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
    //  We have commented this out temporarily so we can see the console log
    //window.location.href=RGConfirmConfig.signupUrl;
    return true;
  }

  // Hide manual email section if present
  setVisible(RGConfirmConfig.selectors.emailSectionWrapper, false);
  applyVerificationUi(status);

  // If both verified, ensure profile exists
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
  
  console.log(sel.ok);
  console.log("Email input: " + emailInput);
  
  if(!emailInput||!emailBtn){ rgLogWarn('No-JWT controls missing'); return; }

  const onSubmit=async (evt)=>{
    try{
      if(evt && typeof evt.preventDefault==='function') evt.preventDefault();
      const email=(emailInput.value||'').trim();
      console.log("Email input value:" + email);
      if(!isLikelyEmail(email)){ rgLogWarn('Invalid email entered'); emailInput.focus(); return; }

      const status=await fetchAccountStatus(email);
      if(!status.exists){
        rgLogInfo('Account does not exist (no-JWT path); redirecting to signup');
        // We have commented this out AGAIN / for a second time temporarily
        //window.location.href=RGConfirmConfig.signupUrl;
        return;
      }
      applyVerificationUi(status);

      // No JWT means we likely cannot call profile endpoints that require auth;
      // so we only attempt ensureProfileExists when user actually has a JWT.
      // If you want to allow unauthenticated creation, your backend must permit it (not recommended).
      if(status.emailVerified && status.phoneVerified){
        rgLogInfo('Both verified but no JWT token available; skipping profile ensure.');
      }

      window.rgConfirmState={ email, status };
    }catch(e){ rgLogError('Error in no-JWT submit handler', e); }
  };

  const form=emailBtn.closest('form');
  if(form){ form.addEventListener('submit', onSubmit); }
  else { emailBtn.addEventListener('click', onSubmit); }
}

/* Init */
async function initConfirm(){
  rgLogInfo('Initializing workflow on confirm.html');

  // Try JWT path first
  const handled = await handleHasJwtPath();
  if(handled){ return; }

  // No usable JWT; show email section and wire handler
  setVisible(RGConfirmConfig.selectors.emailSectionWrapper, true);
  wireNoJwtEmailHandler();
}

/* DOM ready */
document.addEventListener('DOMContentLoaded', function(){
  try{ initConfirm(); }catch(e){ rgLogError('Initialization failed', e); }
});

/* Export minimal debug surface */
window.RGConfirm={
  init:initConfirm,
  config:RGConfirmConfig,
  _ensureProfileExists:ensureProfileExists
};
