// confirm.js

/*
  File: confirm.js
  Page: confirm.html
  Purpose: Front-end workflow for confirmation page.
  Scope: Do NOT change the form or backend Lambdas.
         Orchestrate the page logic only.

  Fixes in this version:
    - Unwrap Lambda proxy responses (body is JSON string).
    - Email confirm now validates success based on payload fields.
    - If confirm fails, user gets a visible message (not silent "nothing").
    - After confirm succeeds, poll /confirmation lookup briefly to handle
      eventual consistency before updating UI.
    - "Resend Email Code" clears the current confirmation code input.
    - Phone verify UI is disabled until emailVerified is true.
*/

/* Begin Config */
const API_BASE = window.RG_API_BASE || 'https://api.rocketgeek.org';

const RGConfirmConfig = {
  confirmationApiUrl: `${API_BASE}/confirmation`,
  verifyApiUrl: `${API_BASE}/verify`,
  getProfileUrl: `${API_BASE}/get-profile`,
  createProfileUrl: `${API_BASE}/create-profile`,
  signupUrl: '/register.html',
  requestTimeoutMs: 12000,
  pollAfterEmailConfirm: {
    attempts: 4,
    delayMs: 750
  },
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


/* Begin Logging helpers */
function rgLogInfo(message, data) {
  try {
    if (data !== undefined) console.log('[confirm.js] INFO:', message, data);
    else console.log('[confirm.js] INFO:', message);
  } catch (ignoreError) {}
}

function rgLogWarn(message, data) {
  try {
    if (data !== undefined) console.warn('[confirm.js] WARN:', message, data);
    else console.warn('[confirm.js] WARN:', message);
  } catch (ignoreError) {}
}

function rgLogError(message, data) {
  try {
    if (data !== undefined) console.error('[confirm.js] ERROR:', message, data);
    else console.error('[confirm.js] ERROR:', message);
  } catch (ignoreError) {}
}
/* End Logging helpers */


/* Begin Validators */
function isString(value) {
  return typeof value === 'string' || value instanceof String;
}

function isNonEmptyString(value) {
  return isString(value) && value.trim().length > 0;
}

function isLikelyEmail(value) {
  if (!isNonEmptyString(value)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
/* End Validators */


/* Begin DOM helpers */
function qs(selector) {
  const element = document.querySelector(selector);
  if (!element) rgLogWarn('Selector not found:', selector);
  return element;
}

function setVisible(selectorOrElement, visible) {
  const element = typeof selectorOrElement === 'string'
    ? document.querySelector(selectorOrElement)
    : selectorOrElement;

  if (!element) return;

  if (visible) {
    element.classList.remove('d-none');
    if (element.style && element.style.display === 'none') {
      element.style.removeProperty('display');
    }
  } else {
    element.classList.add('d-none');
  }
}

function setDisabled(selectorOrElement, disabled) {
  const element = typeof selectorOrElement === 'string'
    ? document.querySelector(selectorOrElement)
    : selectorOrElement;

  if (!element) return;

  try {
    element.disabled = !!disabled;
  } catch (ignoreError) {}
}

function setPhoneControlsEnabled(enabled) {
  const shouldDisable = !enabled;
  setDisabled('#phone', shouldDisable);
  setDisabled('#phoneCode', shouldDisable);
  setDisabled('#btnConfirmPhone', shouldDisable);
  setDisabled('#btnResendPhone', shouldDisable);
}

function setText(elementId, textValue) {
  const element = document.getElementById(elementId);
  if (!element) return;
  element.textContent = String(textValue || '');
}
/* End DOM helpers */


/* Begin Message helpers */
function ensureMessageElementAfter(inputElementId, messageElementId) {
  const existing = document.getElementById(messageElementId);
  if (existing) return existing;

  const inputEl = document.getElementById(inputElementId);
  if (!inputEl || !inputEl.parentNode) return null;

  const messageDiv = document.createElement('div');
  messageDiv.id = messageElementId;
  messageDiv.className = 'small mt-2';
  messageDiv.style.color = '#8b0000';
  messageDiv.textContent = '';
  inputEl.parentNode.appendChild(messageDiv);

  return messageDiv;
}

function setMessage(messageElementId, messageText) {
  const messageEl = document.getElementById(messageElementId);
  if (!messageEl) return;
  messageEl.textContent = String(messageText || '');
}
/* End Message helpers */


/* Begin One-time cleanup of inline display:none so classes control visibility */
function unhideBaseSectionsOnce() {
  const elementIds = [
    'verificationStatus',
    'emailVerifiedBanner',
    'phoneVerifiedBanner',
    'emailConfirmForm',
    'phoneConfirmForm',
    'emailLookupForm'
  ];

  elementIds.forEach(function (idValue) {
    const element = document.getElementById(idValue);
    if (!element) return;

    if (element.style && typeof element.style.removeProperty === 'function') {
      element.style.removeProperty('display');
    } else {
      element.style.display = '';
    }

    element.classList.add('d-none');
  });

  setPhoneControlsEnabled(false);
  rgLogInfo('Ran unhideBaseSectionsOnce to clear inline display:none');
}
/* End One-time cleanup */


/* Begin JWT helpers */
function getIdTokenFromLocalStorage() {
  try {
    const keyNames = Object.keys(localStorage).filter(function (storageKey) {
      return storageKey.includes('CognitoIdentityServiceProvider') &&
        storageKey.endsWith('.idToken');
    });

    if (keyNames.length === 0) return null;

    let bestToken = null;
    let bestLength = -1;

    keyNames.forEach(function (storageKey) {
      const tokenValue = localStorage.getItem(storageKey) || '';
      if (tokenValue.length > bestLength) {
        bestLength = tokenValue.length;
        bestToken = tokenValue;
      }
    });

    return bestToken || null;
  } catch (readError) {
    rgLogWarn('Failed to read idToken from localStorage', readError);
    return null;
  }
}

function parseJwtPayload(jwtToken) {
  if (!isNonEmptyString(jwtToken) || jwtToken.split('.').length !== 3) {
    return null;
  }

  try {
    const base64Part = jwtToken.split('.')[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const needsPadding = base64Part.length % 4;
    const padding = needsPadding ? '='.repeat(4 - needsPadding) : '';

    return JSON.parse(atob(base64Part + padding));
  } catch (parseError) {
    rgLogWarn('JWT parse failed', parseError);
    return null;
  }
}

function extractEmailFromJwt(jwtToken) {
  const payload = parseJwtPayload(jwtToken);
  if (!payload) return null;

  const possibleKeys = ['email', 'custom:email', 'preferred_username'];

  for (let index = 0; index < possibleKeys.length; index++) {
    const keyName = possibleKeys[index];
    if (isLikelyEmail(payload[keyName])) return payload[keyName];
  }

  return null;
}
/* End JWT helpers */


/* Begin Response unwrapping */
function unwrapLambdaPayload(parsedTopLevelJson) {
  if (!parsedTopLevelJson) return null;
  if (typeof parsedTopLevelJson !== 'object') return parsedTopLevelJson;
  if (typeof parsedTopLevelJson.body !== 'string') return parsedTopLevelJson;

  try {
    return JSON.parse(parsedTopLevelJson.body);
  } catch (ignoreError) {
    return parsedTopLevelJson;
  }
}
/* End Response unwrapping */


/* Begin HTTP: public JSON POST */
async function postPublicJson(url, payload, timeoutMs) {
  const abortController = new AbortController();
  const timeoutHandle = setTimeout(function () {
    abortController.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      mode: 'cors',
      body: JSON.stringify(payload || {}),
      signal: abortController.signal
    });

    const responseText = await response.text();

    let parsedJson = null;
    try {
      parsedJson = responseText ? JSON.parse(responseText) : null;
    } catch (ignoreError) {
      parsedJson = null;
    }

    const unwrappedPayload = unwrapLambdaPayload(parsedJson);

    return {
      ok: response.ok,
      status: response.status,
      payload: unwrappedPayload,
      raw: parsedJson,
      text: responseText
    };
  } finally {
    clearTimeout(timeoutHandle);
  }
}
/* End HTTP: public JSON POST */


/* Begin Timing helpers */
function sleepMs(delayMs) {
  return new Promise(function (resolve) {
    setTimeout(resolve, delayMs);
  });
}
/* End Timing helpers */


/* Begin /confirmation API helpers */
async function confirmationLookupByEmail(emailAddress) {
  const payload = { action: 'lookup', email: emailAddress };
  rgLogInfo('POST /confirmation lookup (masked)', { email: '<present>' });

  const response = await postPublicJson(
    RGConfirmConfig.confirmationApiUrl,
    payload,
    RGConfirmConfig.requestTimeoutMs
  );

  rgLogInfo('Confirmation lookup response', {
    ok: response.ok,
    status: response.status,
    payloadKeys: response.payload ? Object.keys(response.payload) : []
  });

  return response;
}

async function confirmationResendEmailCode(emailAddress) {
  const payload = { action: 'resend_email_code', email: emailAddress };
  rgLogInfo('POST /confirmation resend_email_code (masked)', { email: '<present>' });

  const response = await postPublicJson(
    RGConfirmConfig.confirmationApiUrl,
    payload,
    RGConfirmConfig.requestTimeoutMs
  );

  rgLogInfo('Confirmation resend response', {
    ok: response.ok,
    status: response.status,
    payload: response.payload || null
  });

  return response;
}

async function confirmationConfirmEmailCode(emailAddress, verificationCode) {
  const payload = {
    action: 'confirm_email_code',
    email: emailAddress,
    code: verificationCode
  };

  rgLogInfo('POST /confirmation confirm_email_code (masked)', {
    email: '<present>',
    hasCode: !!verificationCode
  });

  const response = await postPublicJson(
    RGConfirmConfig.confirmationApiUrl,
    payload,
    RGConfirmConfig.requestTimeoutMs
  );

  rgLogInfo('Confirmation confirm response', {
    ok: response.ok,
    status: response.status,
    payload: response.payload || null
  });

  return response;
}

function normalizeAccountStatusFromConfirmationLookup(response) {
  const normalized = {
    exists: false,
    emailVerified: false,
    phoneVerified: false,
    phoneOnFile: false
  };

  const payload = response && response.payload ? response.payload : null;
  if (!payload || typeof payload !== 'object') return normalized;

  if (typeof payload.exists === 'boolean') normalized.exists = payload.exists;
  if (typeof payload.email_verified === 'boolean') {
    normalized.emailVerified = payload.email_verified;
  }
  if (typeof payload.phone_verified === 'boolean') {
    normalized.phoneVerified = payload.phone_verified;
  }
  if (typeof payload.phone_on_file === 'boolean') {
    normalized.phoneOnFile = payload.phone_on_file;
  }

  return normalized;
}
/* End /confirmation API helpers */


/* Begin Email confirm success detection */
function isEmailConfirmSuccessPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;

  if (payload.confirmed === true) return true;
  if (payload.email_verified === true) return true;
  if (payload.emailVerified === true) return true;

  if (isNonEmptyString(payload.result)) {
    const resultValue = String(payload.result).toLowerCase();
    if (resultValue.includes('verified')) return true;
    if (resultValue.includes('confirmed')) return true;
    if (resultValue.includes('success')) return true;
  }

  if (isNonEmptyString(payload.next_step)) {
    const nextStep = String(payload.next_step).toLowerCase();
    if (nextStep.includes('sms')) return true;
    if (nextStep.includes('phone')) return true;
  }

  return false;
}

function getEmailConfirmFailureMessage(payload) {
  if (!payload || typeof payload !== 'object') {
    return 'Unable to confirm email. Please try again.';
  }

  if (isNonEmptyString(payload.message)) return String(payload.message);
  if (isNonEmptyString(payload.error)) return String(payload.error);

  if (isNonEmptyString(payload.result)) {
    const resultValue = String(payload.result);
    if (resultValue.toLowerCase().includes('code')) return resultValue;
    if (resultValue.toLowerCase().includes('mismatch')) return resultValue;
    if (resultValue.toLowerCase().includes('expired')) return resultValue;
    return resultValue;
  }

  return 'Email confirmation failed. Check the code and try again.';
}
/* End Email confirm success detection */


/* Begin /verify API helpers (public calls; phone controls gated by emailVerified) */
async function postVerify(payload) {
  rgLogInfo('POST /verify payload (masked)', {
    action: payload.action,
    channel: payload.channel,
    hasCode: !!payload.code,
    phone: payload.phone ? '<present>' : undefined
  });

  const response = await postPublicJson(
    RGConfirmConfig.verifyApiUrl,
    payload,
    RGConfirmConfig.requestTimeoutMs
  );

  rgLogInfo('Verify API response', {
    ok: response.ok,
    status: response.status,
    payload: response.payload || null
  });

  return response;
}

async function sendPhoneCode(phoneNumber) {
  const payload = {
    action: 'send',
    channel: 'sms',
    phone: phoneNumber,
    identifier: phoneNumber
  };
  return postVerify(payload);
}

async function confirmPhoneCode(phoneNumber, verificationCode) {
  const payload = {
    action: 'confirm',
    channel: 'sms',
    phone: phoneNumber,
    identifier: phoneNumber,
    code: verificationCode
  };
  return postVerify(payload);
}
/* End /verify API helpers */


/* Begin Unified status fetch */
async function fetchAccountStatus(emailAddress) {
  rgLogInfo('Calling /confirmation lookup', { identifier: '<redacted>' });

  try {
    const response = await confirmationLookupByEmail(emailAddress);
    return normalizeAccountStatusFromConfirmationLookup(response);
  } catch (requestError) {
    rgLogError('Confirmation lookup failed', requestError);
    return {
      exists: false,
      emailVerified: false,
      phoneVerified: false,
      phoneOnFile: false
    };
  }
}
/* End Unified status fetch */


/* Begin UI application */
function applyVerificationUi(status, currentEmail) {
  const selectors = RGConfirmConfig.selectors;

  const emailToShow = currentEmail ||
    (window.rgConfirmState && window.rgConfirmState.email) || '';

  const emailVerified = status && status.emailVerified === true;
  const phoneVerified = status && status.phoneVerified === true;

  const showAnyBanner = emailVerified || phoneVerified;
  setVisible(selectors.verificationStatus, showAnyBanner);

  if (emailVerified) {
    setVisible(selectors.emailVerifiedBanner, true);
    setVisible(selectors.emailVerificationForm, false);
    setText('verifiedEmailValue', emailToShow);
  } else {
    setVisible(selectors.emailVerifiedBanner, false);
    setVisible(selectors.emailVerificationForm, true);
    const emailConfirmInput = document.getElementById('emailConfirm');
    if (emailConfirmInput) emailConfirmInput.value = emailToShow;
  }

  if (!emailVerified) {
    setVisible(selectors.phoneVerifiedBanner, false);
    setVisible(selectors.phoneVerificationForm, false);
    setPhoneControlsEnabled(false);
  } else if (phoneVerified) {
    setVisible(selectors.phoneVerifiedBanner, true);
    setVisible(selectors.phoneVerificationForm, false);
    setPhoneControlsEnabled(false);
  } else {
    setVisible(selectors.phoneVerifiedBanner, false);
    setVisible(selectors.phoneVerificationForm, true);
    setPhoneControlsEnabled(true);
  }

  setVisible(selectors.emailSectionWrapper, false);
}
/* End UI application */


/* Begin Entry branches */
async function handleHasJwtPath() {
  const token = getIdTokenFromLocalStorage();
  if (!isNonEmptyString(token)) return false;

  const email = extractEmailFromJwt(token);
  rgLogInfo('JWT present; extracted email', {
    email: isNonEmptyString(email) ? '<present>' : '<missing>'
  });

  if (!isLikelyEmail(email)) return false;

  const status = await fetchAccountStatus(email);
  if (!status.exists) {
    rgLogInfo('Account does not exist; redirecting to signup');
    window.location.href = RGConfirmConfig.signupUrl;
    return true;
  }

  applyVerificationUi(status, email);
  window.rgConfirmState = { email: email, status: status };
  return true;
}
/* End Entry branches */


/* Begin Login form wiring (optional) */
function wireLoginForm() {
  const selectors = RGConfirmConfig.selectors;
  const form = document.querySelector(selectors.loginForm || '');
  if (!form) return;

  if (form.dataset && form.dataset.rgWired === 'true') return;
  if (form.dataset) form.dataset.rgWired = 'true';

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    const emailEl = document.querySelector(selectors.loginEmail);
    const passwordEl = document.querySelector(selectors.loginPassword);

    const emailValue = emailEl && emailEl.value ? String(emailEl.value).trim() : '';
    const hasPassword = !!(passwordEl && String(passwordEl.value || '').length > 0);

    if (!isLikelyEmail(emailValue)) {
      rgLogWarn('Login submit: invalid email.');
      if (emailEl) emailEl.focus();
      return;
    }

    rgLogInfo('Confirm page login submit; redirecting to login.html', {
      hasPassword: hasPassword
    });

    try {
      localStorage.setItem('rg_login_email_prefill', emailValue);
    } catch (storageError) {
      rgLogWarn('Could not store prefill email', storageError);
    }

    window.location.href = '/login.html';
  });
}
/* End Login form wiring */


/* Begin No JWT Email Handler helpers */
function setEmailLookupMode(mode, notFoundEmail) {
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
/* End No JWT Email Handler helpers */


/* Begin No JWT Email Handler */
function wireNoJwtEmailHandler() {
  const selectors = RGConfirmConfig.selectors;
  const emailInput = qs(selectors.emailInput);
  const emailButton = qs(selectors.emailSubmitButton);

  if (!emailInput || !emailButton) {
    rgLogWarn('No-JWT controls missing');
    return;
  }

  ensureMessageElementAfter('email', 'rgEmailLookupMessage');

  if (emailButton.dataset && emailButton.dataset.rgRegisterWired !== 'true') {
    emailButton.dataset.rgRegisterWired = 'true';

    emailButton.addEventListener('click', function (event) {
      const mode = emailButton.dataset.rgMode || 'confirm';
      if (mode !== 'register') return;
      event.preventDefault();
      window.location.href = RGConfirmConfig.signupUrl;
    });
  }

  const onSubmit = async function (event) {
    try {
      if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
      }

      setMessage('rgEmailLookupMessage', '');
      setEmailLookupMode('confirm', '');

      const emailValue = (emailInput.value || '').trim();
      if (!isLikelyEmail(emailValue)) {
        rgLogWarn('Invalid email entered');
        setMessage('rgEmailLookupMessage', 'Please enter a valid email address.');
        emailInput.focus();
        return;
      }

      const status = await fetchAccountStatus(emailValue);
      if (!status.exists) {
        rgLogInfo('Account does not exist; offering registration');
        setMessage('rgEmailLookupMessage', 'No account found. Click Register to create one.');
        setEmailLookupMode('register', emailValue);
        return;
      }

      window.rgConfirmState = window.rgConfirmState || {};
      window.rgConfirmState.email = emailValue;
      window.rgConfirmState.status = status;

      applyVerificationUi(status, emailValue);

      if (status.emailVerified !== true) {
        const alreadySentForThisEmail =
          window.rgConfirmState.emailCodeSent === true &&
          window.rgConfirmState.emailCodeSentFor === emailValue;

        if (!alreadySentForThisEmail) {
          rgLogInfo('Email not verified; auto-sending verification code');
          const resendResponse = await confirmationResendEmailCode(emailValue);

          if (resendResponse.ok) {
            window.rgConfirmState.emailCodeSent = true;
            window.rgConfirmState.emailCodeSentFor = emailValue;
            rgLogInfo('Auto-send email code: success');
          } else {
            rgLogWarn('Auto-send email code: failed', {
              status: resendResponse.status,
              payload: resendResponse.payload || null
            });
            setMessage('rgEmailLookupMessage', 'Unable to send code. Please click Resend Email Code.');
          }
        } else {
          rgLogInfo('Email code already sent this session; not resending');
        }
      }
    } catch (handlerError) {
      rgLogError('Error in no-JWT submit handler', handlerError);
    }
  };

  const formElement = emailButton.closest('form');
  if (formElement) formElement.addEventListener('submit', onSubmit);
  else emailButton.addEventListener('click', onSubmit);
}
/* End No JWT Email Handler */


/* Begin Post-confirm polling */
async function pollForEmailVerified(emailValue) {
  const attempts = RGConfirmConfig.pollAfterEmailConfirm.attempts;
  const delayMs = RGConfirmConfig.pollAfterEmailConfirm.delayMs;

  for (let attemptIndex = 1; attemptIndex <= attempts; attemptIndex++) {
    const status = await fetchAccountStatus(emailValue);
    rgLogInfo('Post-confirm lookup poll', {
      attempt: attemptIndex,
      emailVerified: status.emailVerified,
      phoneVerified: status.phoneVerified
    });

    if (status.emailVerified === true) return status;
    if (attemptIndex < attempts) await sleepMs(delayMs);
  }

  return null;
}
/* End Post-confirm polling */


/* Begin Verification form wiring */
function wireVerificationForms() {
  ensureMessageElementAfter('emailCode', 'rgEmailConfirmMessage');

  const emailConfirmForm = document.getElementById('emailConfirmForm');

  if (emailConfirmForm) {
    emailConfirmForm.addEventListener('submit', async function (event) {
      event.preventDefault();

      try {
        setMessage('rgEmailConfirmMessage', '');

        const emailConfirmInput = document.getElementById('emailConfirm');
        const emailFromField = emailConfirmInput && emailConfirmInput.value
          ? String(emailConfirmInput.value).trim()
          : '';

        const emailValue = isLikelyEmail(emailFromField)
          ? emailFromField
          : (window.rgConfirmState && window.rgConfirmState.email) || '';

        const codeInput = document.getElementById('emailCode');
        const codeValue = codeInput ? String(codeInput.value || '').trim() : '';

        if (!isLikelyEmail(emailValue)) {
          rgLogWarn('Confirm email clicked with missing/invalid email.');
          setMessage('rgEmailConfirmMessage', 'Missing email address.');
          return;
        }

        if (!codeValue) {
          rgLogWarn('Confirm email clicked with empty code.');
          setMessage('rgEmailConfirmMessage', 'Please enter the email confirmation code.');
          return;
        }

        const response = await confirmationConfirmEmailCode(emailValue, codeValue);

        if (response.ok !== true) {
          setMessage('rgEmailConfirmMessage', 'Email confirmation request failed.');
          return;
        }

        const confirmPayload = response.payload || null;
        const confirmOk = isEmailConfirmSuccessPayload(confirmPayload);

        if (confirmOk !== true) {
          const failureMessage = getEmailConfirmFailureMessage(confirmPayload);
          rgLogWarn('Email confirm did not indicate success', { payload: confirmPayload });
          setMessage('rgEmailConfirmMessage', failureMessage);
          return;
        }

        setMessage('rgEmailConfirmMessage', 'Code accepted. Verifying status...');

        const polledStatus = await pollForEmailVerified(emailValue);
        if (!polledStatus) {
          setMessage('rgEmailConfirmMessage', 'Confirmed, but status did not update yet. Try again in a moment.');
          return;
        }

        window.rgConfirmState = { email: emailValue, status: polledStatus };
        applyVerificationUi(polledStatus, emailValue);
        setMessage('rgEmailConfirmMessage', '');
      } catch (handlerError) {
        rgLogError('Email confirm handler error', handlerError);
        setMessage('rgEmailConfirmMessage', 'Unexpected error during email confirmation.');
      }
    });
  }

  const btnResendEmail = document.getElementById('btnResendEmail');

  if (btnResendEmail) {
    btnResendEmail.addEventListener('click', async function () {
      try {
        setMessage('rgEmailConfirmMessage', '');

        const emailConfirmInput = document.getElementById('emailConfirm');
        const emailFromField = emailConfirmInput && emailConfirmInput.value
          ? String(emailConfirmInput.value).trim()
          : '';

        const emailValue = isLikelyEmail(emailFromField)
          ? emailFromField
          : (window.rgConfirmState && window.rgConfirmState.email) || '';

        if (!isLikelyEmail(emailValue)) {
          rgLogWarn('Resend email clicked with invalid or missing email.');
          setMessage('rgEmailConfirmMessage', 'Missing email address.');
          return;
        }

        const response = await confirmationResendEmailCode(emailValue);

        const emailCodeInput = document.getElementById('emailCode');
        if (emailCodeInput) {
          emailCodeInput.value = '';
          emailCodeInput.focus();
        }

        if (response.ok) {
          rgLogInfo('Resent email verification code.');
          setMessage('rgEmailConfirmMessage', 'A new code has been sent.');
        } else {
          rgLogWarn('Failed to resend email code.', {
            status: response.status,
            payload: response.payload || null
          });
          setMessage('rgEmailConfirmMessage', 'Unable to resend code. Try again later.');
        }
      } catch (handlerError) {
        rgLogError('Resend email handler error', handlerError);
        setMessage('rgEmailConfirmMessage', 'Unexpected error during resend.');
      }
    });
  }

  const phoneConfirmForm = document.getElementById('phoneConfirmForm');

  if (phoneConfirmForm) {
    phoneConfirmForm.addEventListener('submit', async function (event) {
      event.preventDefault();

      try {
        const currentState = window.rgConfirmState || {};
        const currentStatus = currentState.status || {};

        if (currentStatus.emailVerified !== true) {
          rgLogWarn('Phone confirm blocked: email not verified.');
          return;
        }

        const phoneInput = document.getElementById('phone');
        const phoneValue = phoneInput ? String(phoneInput.value || '').trim() : '';

        const codeInput = document.getElementById('phoneCode');
        const codeValue = codeInput ? String(codeInput.value || '').trim() : '';

        if (!phoneValue) {
          rgLogWarn('Confirm phone clicked with empty phone.');
          return;
        }

        if (!codeValue) {
          rgLogWarn('Confirm phone clicked with empty code.');
          return;
        }

        const response = await confirmPhoneCode(phoneValue, codeValue);

        if (!response.ok) {
          rgLogWarn('Phone confirm API returned non-ok', {
            status: response.status,
            payload: response.payload || null
          });
          return;
        }

        const emailValue = currentState.email || '';
        if (isLikelyEmail(emailValue)) {
          const refreshedStatus = await fetchAccountStatus(emailValue);
          window.rgConfirmState = { email: emailValue, status: refreshedStatus };
          applyVerificationUi(refreshedStatus, emailValue);
        }
      } catch (handlerError) {
        rgLogError('Phone confirm handler error', handlerError);
      }
    });
  }

  const btnResendPhone = document.getElementById('btnResendPhone');

  if (btnResendPhone) {
    btnResendPhone.addEventListener('click', async function () {
      try {
        const currentState = window.rgConfirmState || {};
        const currentStatus = currentState.status || {};

        if (currentStatus.emailVerified !== true) {
          rgLogWarn('Resend SMS blocked: email not verified.');
          return;
        }

        const phoneInput = document.getElementById('phone');
        const phoneValue = phoneInput ? String(phoneInput.value || '').trim() : '';

        if (!phoneValue) {
          rgLogWarn('Resend phone clicked with empty phone.');
          return;
        }

        const response = await sendPhoneCode(phoneValue);

        if (response.ok) rgLogInfo('Resent SMS verification code.');
        else rgLogWarn('Failed to resend SMS code.', {
          status: response.status,
          payload: response.payload || null
        });
      } catch (handlerError) {
        rgLogError('Resend phone handler error', handlerError);
      }
    });
  }
}
/* End Verification form wiring */


/* Begin Init */
async function initConfirm() {
  rgLogInfo('Initializing workflow on confirm.html');

  const handled = await handleHasJwtPath();
  if (handled) return;

  const loginFormEl = document.querySelector(RGConfirmConfig.selectors.loginForm);

  if (loginFormEl) {
    setVisible(RGConfirmConfig.selectors.emailSectionWrapper, false);
    setVisible(RGConfirmConfig.selectors.loginForm, true);
    wireLoginForm();
    return;
  }

  setVisible(RGConfirmConfig.selectors.emailSectionWrapper, true);
  wireNoJwtEmailHandler();
}
/* End Init */


/* Begin DOM ready */
document.addEventListener('DOMContentLoaded', function () {
  try {
    unhideBaseSectionsOnce();
    wireVerificationForms();
    wireLoginForm();
    initConfirm();
  } catch (initError) {
    rgLogError('Initialization failed', initError);
  }
});
/* End DOM ready */


/* Begin Export minimal debug surface */
window.RGConfirm = {
  init: initConfirm,
  config: RGConfirmConfig
};
/* End Export */
