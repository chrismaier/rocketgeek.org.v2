// confirm.js

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
  confirmationApiUrl: `${API_BASE}/confirmation`,
  verifyApiUrl: `${API_BASE}/verify`,
  getProfileUrl: `${API_BASE}/get-profile`,
  createProfileUrl: `${API_BASE}/create-profile`,
  signupUrl: '/register.html',
  requestTimeoutMs: 12000,
  selectors: {
    emailSectionWrapper: '#emailLookupForm',
    emailInput: '#email',
    emailSubmitButton: '#btnCheckEmail',
    verificationStatus: '#verificationStatus',
    emailVerificationForm: '#emailConfirmForm',
    emailVerifiedBanner: '#emailVerifiedBanner',
    phoneVerificationForm: '#phoneConfirmForm',
    phoneVerifiedBanner: '#phoneVerifiedBanner',
    loginForm: '#loginForm',
    loginEmail: '#loginEmail',
    loginPassword: '#loginPassword',
    loginButton: '#btnLogin'
  }
};
/* End Config */


/* Logging helpers */
function rgLogInfo(message, data){ try{ data!==undefined?console.log('[confirm.js] INFO:', message, data):console.log('[confirm.js] INFO:', message);}catch(ignoreError){} }
function rgLogWarn(message, data){ try{ data!==undefined?console.warn('[confirm.js] WARN:', message, data):console.warn('[confirm.js] WARN:', message);}catch(ignoreError){} }
function rgLogError(message, data){ try{ data!==undefined?console.error('[confirm.js] ERROR:', message, data):console.error('[confirm.js] ERROR:', message);}catch(ignoreError){} }


/* Validators */
function isString(value){ return typeof value === 'string' || value instanceof String; }
function isNonEmptyString(value){ return isString(value) && value.trim().length > 0; }
function isLikelyEmail(value){ if(!isNonEmptyString(value)) return false; return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()); }


/* DOM helpers */
function qs(selector){
  const element = document.querySelector(selector);
  if(!element) rgLogWarn('Selector not found:', selector);
  return element;
}

function setVisible(selectorOrElement, visible){
  const element = typeof selectorOrElement === 'string' ? document.querySelector(selectorOrElement) : selectorOrElement;
  if (!element) return;
  if (visible) {
    element.classList.remove('d-none');
    if (element.style && element.style.display === 'none') element.style.removeProperty('display');
  } else {
    element.classList.add('d-none');
  }
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
  ids.forEach(function(idValue){
    const element = document.getElementById(idValue);
    if (!element) return;
    if (element.style && typeof element.style.removeProperty === 'function') {
      element.style.removeProperty('display');
    } else {
      element.style.display = '';
    }
    element.classList.add('d-none');
  });
  rgLogInfo('Ran unhideBaseSectionsOnce to clear inline display:none');
}


/* JWT helpers */
function getIdTokenFromLocalStorage(){
  try{
    const keys = Object.keys(localStorage).filter(function(keyName){
      return keyName.includes('CognitoIdentityServiceProvider') && keyName.endsWith('.idToken');
    });
    if(keys.length === 0) return null;
    let bestToken = null;
    let bestLength = -1;
    keys.forEach(function(keyName){
      const tokenValue = localStorage.getItem(keyName) || '';
      if(tokenValue.length > bestLength){
        bestLength = tokenValue.length;
        bestToken = tokenValue;
      }
    });
    return bestToken || null;
  }catch(readError){
    rgLogWarn('Failed to read idToken from localStorage', readError);
    return null;
  }
}

function parseJwtPayload(jwtToken){
  if(!isNonEmptyString(jwtToken) || jwtToken.split('.').length !== 3) return null;
  try{
    const base64Part = jwtToken.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
    const padding = base64Part.length % 4 ? '='.repeat(4 - (base64Part.length % 4)) : '';
    return JSON.parse(atob(base64Part + padding));
  }catch(parseError){
    rgLogWarn('JWT parse failed', parseError);
    return null;
  }
}

function extractEmailFromJwt(jwtToken){
  const payload = parseJwtPayload(jwtToken);
  if(!payload) return null;
  const possibleKeys = ['email','custom:email','preferred_username'];
  for (let index = 0; index < possibleKeys.length; index++) {
    const keyName = possibleKeys[index];
    if (isLikelyEmail(payload[keyName])) return payload[keyName];
  }
  return null;
}


/* HTTP helper */
async function postJson(url, body, timeoutMs, authToken) {
  const abortController = new AbortController();
  const timeoutHandle = setTimeout(function(){ abortController.abort(); }, timeoutMs);
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (typeof authToken === 'string' && authToken.trim().length > 0) {
      const tokenValue = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;
      headers['Authorization'] = tokenValue;
    }
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      mode: 'cors',
      body: JSON.stringify(body || {}),
      signal: abortController.signal
    });
    const responseText = await response.text();
    let responseJson = null;
    try { responseJson = responseText ? JSON.parse(responseText) : null; } catch (parseError) { responseJson = null; }
    return { ok: response.ok, status: response.status, json: responseJson, text: responseText };
  } finally {
    clearTimeout(timeoutHandle);
  }
}


/* Auth token helper (for authenticated calls) */
function getAuthTokenAtCallTime(){
  if (window.rgAuth && isNonEmptyString(window.rgAuth.idToken)) return window.rgAuth.idToken;
  return getIdTokenFromLocalStorage();
}


/* Email confirmation API helpers (/confirmation) */
async function confirmationLookupByEmail(emailAddress) {
  const payload = { action: 'lookup', email: emailAddress };
  rgLogInfo('POST /confirmation lookup (masked)', { email: '<present>' });
  const response = await postJson(RGConfirmConfig.confirmationApiUrl, payload, RGConfirmConfig.requestTimeoutMs);
  rgLogInfo('Confirmation lookup response', { status: response.status, ok: response.ok, body: response.json || response.text });
  return response;
}

async function confirmationResendEmailCode(emailAddress) {
  const payload = { action: 'resend_email_code', email: emailAddress };
  rgLogInfo('POST /confirmation resend_email_code (masked)', { email: '<present>' });
  const response = await postJson(RGConfirmConfig.confirmationApiUrl, payload, RGConfirmConfig.requestTimeoutMs);
  rgLogInfo('Confirmation resend response', { status: response.status, ok: response.ok, body: response.json || response.text });
  return response;
}

async function confirmationConfirmEmailCode(emailAddress, verificationCode) {
  const payload = { action: 'confirm_email_code', email: emailAddress, code: verificationCode };
  rgLogInfo('POST /confirmation confirm_email_code (masked)', { email: '<present>', hasCode: !!verificationCode });
  const response = await postJson(RGConfirmConfig.confirmationApiUrl, payload, RGConfirmConfig.requestTimeoutMs);
  rgLogInfo('Confirmation confirm response', { status: response.status, ok: response.ok, body: response.json || response.text });
  return response;
}

function normalizeAccountStatusFromConfirmationLookup(response) {
  const normalized = { exists: false, emailVerified: false, phoneVerified: false, phoneOnFile: false };
  if (!response || !response.json) return normalized;

  const responseJson = response.json;
  if (typeof responseJson.exists === 'boolean') normalized.exists = responseJson.exists;
  if (typeof responseJson.email_verified === 'boolean') normalized.emailVerified = responseJson.email_verified;
  if (typeof responseJson.phone_verified === 'boolean') normalized.phoneVerified = responseJson.phone_verified;
  if (typeof responseJson.phone_on_file === 'boolean') normalized.phoneOnFile = responseJson.phone_on_file;

  return normalized;
}


/* Phone verify API helpers (/verify) */
async function postVerify(payload, includeAuth){
  const authToken = includeAuth ? getAuthTokenAtCallTime() : undefined;
  rgLogInfo('POST /verify payload (masked)', {
    action: payload.action,
    channel: payload.channel,
    hasCode: !!payload.code,
    phone: payload.phone ? '<present>' : undefined
  });
  const response = await postJson(RGConfirmConfig.verifyApiUrl, payload, RGConfirmConfig.requestTimeoutMs, authToken);
  rgLogInfo('Verify API response', { status: response.status, ok: response.ok, body: response.json || response.text });
  return response;
}

async function sendPhoneCode(phoneNumber){
  const payload = { action:'send', channel:'sms', phone:phoneNumber, identifier:phoneNumber };
  return postVerify(payload, true);
}

async function confirmPhoneCode(phoneNumber, verificationCode){
  const payload = { action:'confirm', channel:'sms', phone:phoneNumber, identifier:phoneNumber, code:verificationCode };
  return postVerify(payload, true);
}


/* Unified status fetch */
async function fetchAccountStatus(emailAddress) {
  rgLogInfo('Calling /confirmation lookup', { identifier: '<redacted>' });
  try {
    const response = await confirmationLookupByEmail(emailAddress);
    return normalizeAccountStatusFromConfirmationLookup(response);
  } catch (requestError) {
    rgLogError('Confirmation lookup failed', requestError);
    return { exists: false, emailVerified: false, phoneVerified: false, phoneOnFile: false };
  }
}


/* Profile directory orchestration */
async function ensureProfileExists(authToken){
  try{
    rgLogInfo('Checking for existing profile via /get-profile');
    const response = await postJson(RGConfirmConfig.getProfileUrl, {}, RGConfirmConfig.requestTimeoutMs, authToken);
    if(response.ok){
      rgLogInfo('Profile exists or was returned successfully');
      return true;
    }
    if(response.json && (response.json.not_found === true || response.json.error === 'profile_not_found')){
      rgLogInfo('Profile not found per JSON signal; creating default profile');
      return await createDefaultProfile(authToken);
    }
    if(response.status === 404){
      rgLogInfo('Profile not found (404); creating default profile');
      return await createDefaultProfile(authToken);
    }
    rgLogWarn('Unexpected get-profile response; not creating profile', {status: response.status, body: response.json || response.text});
    return false;
  }catch(profileError){
    rgLogError('Error during profile existence check', profileError);
    return false;
  }
}

async function createDefaultProfile(authToken){
  const payload = { initialize: true };
  try{
    rgLogInfo('Creating default profile via /create-profile');
    const response = await postJson(RGConfirmConfig.createProfileUrl, payload, RGConfirmConfig.requestTimeoutMs, authToken);
    rgLogInfo('Create-profile response', {status: response.status, ok: response.ok, body: response.json || response.text});
    return !!response.ok;
  }catch(createError){
    rgLogError('Create-profile call failed', createError);
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

  if (status.phoneVerified) {
    setVisible(sel.phoneVerifiedBanner, true);
    setVisible(sel.phoneVerificationForm, false);
  } else {
    setVisible(sel.phoneVerifiedBanner, false);
    setVisible(sel.phoneVerificationForm, true);
  }

  if (sel.emailSectionWrapper) {
    setVisible(sel.emailSectionWrapper, false);
  }
}


/* Entry branches */
async function handleHasJwtPath(){
  const token = getIdTokenFromLocalStorage();
  if(!isNonEmptyString(token)) return false;

  const email = extractEmailFromJwt(token);
  rgLogInfo('JWT present; extracted email', {email: isNonEmptyString(email) ? '<present>' : '<missing>'});
  if(!isLikelyEmail(email)) return false;

  const status = await fetchAccountStatus(email);
  if(!status.exists){
    rgLogInfo('Account does not exist; redirecting to signup');
    return true;
  }

  setVisible(RGConfirmConfig.selectors.emailSectionWrapper, false);
  applyVerificationUi(status, email);

  if(status.emailVerified && status.phoneVerified){
    const ok = await ensureProfileExists(token);
    rgLogInfo('Profile ensure result', {ok: ok});
  }

  window.rgConfirmState = { email: email, status: status };
  return true;
}


/* Login form wiring (top-level) */
function wireLoginForm(){
  const sel = RGConfirmConfig.selectors;
  const form = document.querySelector(sel.loginForm || '');
  if (!form) return;

  if (form.dataset && form.dataset.rgWired === 'true') return;
  if (form.dataset) form.dataset.rgWired = 'true';

  form.addEventListener('submit', function(evt){
    evt.preventDefault();

    const emailEl = document.querySelector(sel.loginEmail);
    const passwordEl = document.querySelector(sel.loginPassword);

    const email = (emailEl && emailEl.value ? String(emailEl.value).trim() : '');
    const hasPassword = !!(passwordEl && String(passwordEl.value || '').length > 0);

    if (!isLikelyEmail(email)) {
      rgLogWarn('Login submit: invalid email.');
      if (emailEl) emailEl.focus();
      return;
    }

    rgLogInfo('Confirm page login submit detected; redirecting to login.html', { hasPassword: hasPassword });

    try { localStorage.setItem('rg_login_email_prefill', email); } catch (storageError) { rgLogWarn('Could not store prefill email', storageError); }

    window.location.href = '/login.html';
  });
}

/* No JWT Email Handler Helper Functions */
function ensureEmailLookupMessageElement(){
  const existing = document.getElementById('rgEmailLookupMessage');
  if (existing) return existing;
  const emailInputEl = document.getElementById('email');
  if (!emailInputEl || !emailInputEl.parentNode) return null;
  const messageDiv = document.createElement('div');
  messageDiv.id = 'rgEmailLookupMessage';
  messageDiv.className = 'small mt-2';
  messageDiv.style.color = '#8b0000';
  messageDiv.textContent = '';
  emailInputEl.parentNode.appendChild(messageDiv);
  return messageDiv;
}

function setEmailLookupMode(mode, notFoundEmail){
  const buttonEl = document.getElementById('btnCheckEmail');
  if (!buttonEl) return;
  if (!buttonEl.dataset.rgOriginalLabel) buttonEl.dataset.rgOriginalLabel = buttonEl.textContent.trim();
  if (mode === 'register') {
    buttonEl.textContent = 'Register';
    buttonEl.dataset.rgMode = 'register';
    buttonEl.dataset.rgNotFoundEmail = String(notFoundEmail || '').trim();
  } else {
    buttonEl.textContent = buttonEl.dataset.rgOriginalLabel || 'Confirm Account';
    buttonEl.dataset.rgMode = 'confirm';
    buttonEl.dataset.rgNotFoundEmail = '';
  }
}
/* end No JWT Email Handler Helper Functions */

/* No JWT Email Handler */
function wireNoJwtEmailHandler(){
  const selectors = RGConfirmConfig.selectors;
  const emailInput = qs(selectors.emailInput);
  const emailButton = qs(selectors.emailSubmitButton);

  if(!emailInput || !emailButton){
    rgLogWarn('No-JWT controls missing');
    return;
  }

  function ensureEmailLookupMessageElement(){
    const existing = document.getElementById('rgEmailLookupMessage');
    if (existing) return existing;

    const emailInputEl = document.getElementById('email');
    if (!emailInputEl || !emailInputEl.parentNode) return null;

    const messageDiv = document.createElement('div');
    messageDiv.id = 'rgEmailLookupMessage';
    messageDiv.className = 'small mt-2';
    messageDiv.style.color = '#8b0000';
    messageDiv.textContent = '';
    emailInputEl.parentNode.appendChild(messageDiv);

    return messageDiv;
  }

  function setEmailLookupMode(mode, notFoundEmail){
    const buttonEl = document.getElementById('btnCheckEmail');
    if (!buttonEl) return;

    if (!buttonEl.dataset.rgOriginalLabel) {
      buttonEl.dataset.rgOriginalLabel = buttonEl.textContent.trim();
    }

    if (mode === 'register') {
      buttonEl.textContent = 'Register';
      buttonEl.dataset.rgMode = 'register';
      buttonEl.dataset.rgNotFoundEmail = String(notFoundEmail || '').trim();
    } else {
      buttonEl.textContent = buttonEl.dataset.rgOriginalLabel || 'Confirm Account';
      buttonEl.dataset.rgMode = 'confirm';
      buttonEl.dataset.rgNotFoundEmail = '';
    }
  }

  if (emailButton.dataset && emailButton.dataset.rgRegisterWired !== 'true') {
    emailButton.dataset.rgRegisterWired = 'true';
    emailButton.addEventListener('click', function(event){
      const mode = emailButton.dataset.rgMode || 'confirm';
      if (mode !== 'register') return;
      event.preventDefault();
      window.location.href = RGConfirmConfig.signupUrl;
    });
  }

  const onSubmit = async function(event){
    try{
      if(event && typeof event.preventDefault === 'function') event.preventDefault();

      const messageEl = ensureEmailLookupMessageElement();
      if (messageEl) messageEl.textContent = '';
      setEmailLookupMode('confirm', '');

      const emailValue = (emailInput.value || '').trim();
      if(!isLikelyEmail(emailValue)){
        rgLogWarn('Invalid email entered');
        if (messageEl) messageEl.textContent = 'Please enter a valid email address.';
        emailInput.focus();
        return;
      }

      const status = await fetchAccountStatus(emailValue);
      if(!status.exists){
        rgLogInfo('Account does not exist (no-JWT path); offering registration');
        if (messageEl) messageEl.textContent = 'No account found for that email. Click Register to create one.';
        setEmailLookupMode('register', emailValue);
        return;
      }

      window.rgConfirmState = window.rgConfirmState || {};
      window.rgConfirmState.email = emailValue;
      window.rgConfirmState.status = status;

      applyVerificationUi(status, emailValue);

      if(status.emailVerified !== true){
        const alreadySentForThisEmail =
          window.rgConfirmState.emailCodeSent === true &&
          window.rgConfirmState.emailCodeSentFor === emailValue;

        if(!alreadySentForThisEmail){
          rgLogInfo('Email not verified; auto-sending verification code');
          const resendResponse = await confirmationResendEmailCode(emailValue);

          if(resendResponse.ok){
            window.rgConfirmState.emailCodeSent = true;
            window.rgConfirmState.emailCodeSentFor = emailValue;
            rgLogInfo('Auto-send email code: success');
          } else {
            rgLogWarn('Auto-send email code: failed', resendResponse.json || resendResponse.text);
            alert('Unable to send verification code. Please click Resend Email Code.');
          }
        } else {
          rgLogInfo('Email code already sent for this email during this session; not resending');
        }
      }
    }catch(handlerError){
      rgLogError('Error in no-JWT submit handler', handlerError);
    }
  };

  const formElement = emailButton.closest('form');
  if(formElement){
    formElement.addEventListener('submit', onSubmit);
  } else {
    emailButton.addEventListener('click', onSubmit);
  }
}
/* End No JWT Email Handler */



/* Verification form wiring */
function wireVerificationForms(){
  const emailConfirmForm = document.getElementById('emailConfirmForm');
  if (emailConfirmForm) {
    emailConfirmForm.addEventListener('submit', async function(evt){
      evt.preventDefault();
      try {
        const emailConfirmInput = document.getElementById('emailConfirm');
        const emailFromField = emailConfirmInput && emailConfirmInput.value ? emailConfirmInput.value.trim() : '';
        const emailValue = isLikelyEmail(emailFromField) ? emailFromField : (window.rgConfirmState && window.rgConfirmState.email) || '';

        const codeInput = document.getElementById('emailCode');
        const codeValue = codeInput ? String(codeInput.value || '').trim() : '';

        if (!isLikelyEmail(emailValue)) { rgLogWarn('Confirm email clicked with invalid or missing email.'); return; }
        if (!codeValue) { rgLogWarn('Confirm email clicked with empty code.'); return; }

        const response = await confirmationConfirmEmailCode(emailValue, codeValue);
        const confirmed = (response.ok && response.json && response.json.confirmed === true) || (response.json && response.json.email_verified === true);

        if (confirmed) {
          rgLogInfo('Email confirmation succeeded.');
          const refreshedStatus = await fetchAccountStatus(emailValue);

          window.rgConfirmState = { email: emailValue, status: refreshedStatus };
          applyVerificationUi(refreshedStatus, emailValue);

          const token = getAuthTokenAtCallTime();
          if (refreshedStatus.emailVerified && refreshedStatus.phoneVerified && token) {
            const ensured = await ensureProfileExists(token);
            rgLogInfo('Profile ensure after email confirm', { ok: ensured });
          }
        } else {
          rgLogWarn('Email confirmation failed.', response.json || response.text);
        }
      } catch (handlerError) {
        rgLogError('Email confirm handler error', handlerError);
      }
    });
  }

  const btnResendEmail = document.getElementById('btnResendEmail');
  if (btnResendEmail) {
    btnResendEmail.addEventListener('click', async function(){
      try {
        const emailConfirmInput = document.getElementById('emailConfirm');
        const emailFromField = emailConfirmInput && emailConfirmInput.value ? emailConfirmInput.value.trim() : '';
        const emailValue = isLikelyEmail(emailFromField) ? emailFromField : (window.rgConfirmState && window.rgConfirmState.email) || '';

        if (!isLikelyEmail(emailValue)) { rgLogWarn('Resend email clicked with invalid or missing email.'); return; }

        const response = await confirmationResendEmailCode(emailValue);
        if (response.ok) rgLogInfo('Resent email verification code successfully.');
        else rgLogWarn('Failed to resend email code.', response.json || response.text);
      } catch (handlerError) {
        rgLogError('Resend email handler error', handlerError);
      }
    });
  }

  const phoneConfirmForm = document.getElementById('phoneConfirmForm');
  if (phoneConfirmForm) {
    phoneConfirmForm.addEventListener('submit', async function(evt){
      evt.preventDefault();
      try {
        const phoneInput = document.getElementById('phone');
        const phoneValue = phoneInput ? String(phoneInput.value || '').trim() : '';
        const codeInput = document.getElementById('phoneCode');
        const codeValue = codeInput ? String(codeInput.value || '').trim() : '';

        if (!phoneValue) { rgLogWarn('Confirm phone clicked with empty phone.'); return; }
        if (!codeValue)  { rgLogWarn('Confirm phone clicked with empty code.');  return; }

        const response = await confirmPhoneCode(phoneValue, codeValue);
        const confirmed = response.ok && response.json && (response.json.confirmed === true || response.json.phone_verified === true);

        if (confirmed) {
          rgLogInfo('Phone confirmation succeeded.');
          const currentEmail = (window.rgConfirmState && window.rgConfirmState.email) || '';
          const refreshedStatus = currentEmail ? await fetchAccountStatus(currentEmail) : (window.rgConfirmState && window.rgConfirmState.status) || { exists:false, emailVerified:false, phoneVerified:true, phoneOnFile:true };

          refreshedStatus.phoneVerified = true;

          window.rgConfirmState = { email: currentEmail, status: refreshedStatus };
          applyVerificationUi(refreshedStatus, currentEmail);

          const token = getAuthTokenAtCallTime();
          if (refreshedStatus.emailVerified && refreshedStatus.phoneVerified && token) {
            const ensured = await ensureProfileExists(token);
            rgLogInfo('Profile ensure after phone confirm', { ok: ensured });
          }
        } else {
          rgLogWarn('Phone confirmation failed.', response.json || response.text);
        }
      } catch (handlerError) {
        rgLogError('Phone confirm handler error', handlerError);
      }
    });
  }

  const btnResendPhone = document.getElementById('btnResendPhone');
  if (btnResendPhone) {
    btnResendPhone.addEventListener('click', async function(){
      try {
        const phoneInput = document.getElementById('phone');
        const phoneValue = phoneInput ? String(phoneInput.value || '').trim() : '';
        if (!phoneValue) { rgLogWarn('Resend phone clicked with empty phone.'); return; }

        const response = await sendPhoneCode(phoneValue);
        if (response.ok) rgLogInfo('Resent SMS verification code successfully.');
        else rgLogWarn('Failed to resend SMS code.', response.json || response.text);
      } catch (handlerError) {
        rgLogError('Resend phone handler error', handlerError);
      }
    });
  }
}


/* Init */
async function initConfirm(){
  rgLogInfo('Initializing workflow on confirm.html');

  const handled = await handleHasJwtPath();
  if(handled) return;

  const loginFormEl = document.querySelector(RGConfirmConfig.selectors.loginForm || '');
  if (loginFormEl) {
    setVisible(RGConfirmConfig.selectors.emailSectionWrapper, false);
    setVisible(RGConfirmConfig.selectors.loginForm, true);
    wireLoginForm();
  } else {
    setVisible(RGConfirmConfig.selectors.emailSectionWrapper, true);
    wireNoJwtEmailHandler();
  }
}


/* DOM ready */
document.addEventListener('DOMContentLoaded', function(){
  try{
    unhideBaseSectionsOnce();
    wireVerificationForms();
    wireLoginForm();
    initConfirm();
  }catch(initError){
    rgLogError('Initialization failed', initError);
  }
});


/* Export minimal debug surface */
window.RGConfirm = {
  init: initConfirm,
  config: RGConfirmConfig,
  _ensureProfileExists: ensureProfileExists
};
