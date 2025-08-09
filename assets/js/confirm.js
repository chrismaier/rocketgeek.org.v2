/* confirm.js — Activities 1–3: JWT detection, lookup via /verify, and email/phone verification UI.
   - No single-letter variable names
   - Honors your existing form IDs and Bootstrap classes
   - Uses unauthenticated POST https://api.rocketgeek.org/verify
   - Shows phone section only when a JWT is present
*/

(function () {
    // ---------- Utilities ----------
    const TOKEN_STORAGE_KEYS = [
        "id_token", "idToken", "cognitoIdToken", "RG_ID_TOKEN",
        "access_token", "accessToken", "cognitoAccessToken"
    ];
    
    function byId(id) { return document.getElementById(id); }
    function show(element) { if (element) element.style.display = "block"; }
    function hide(element) { if (element) element.style.display = "none"; }
    function setText(element, text) { if (element) element.textContent = text; }
    function logInfo(...args) { console.log("[confirm.js]", ...args); }
    
    function getStoredJwt() {
        for (const key of TOKEN_STORAGE_KEYS) {
            const value = localStorage.getItem(key) || sessionStorage.getItem(key);
            if (value) return value;
        }
        try {
            const cookieMap = document.cookie.split(";").reduce((acc, part) => {
                const [key, val] = part.trim().split("=");
                if (key && val) acc[key] = decodeURIComponent(val);
                return acc;
            }, {});
            for (const key of TOKEN_STORAGE_KEYS) {
                if (cookieMap[key]) return cookieMap[key];
            }
        } catch {}
        return null;
    }
    
    function base64UrlToString(input) {
        const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
        const padding = normalized.length % 4 ? "=".repeat(4 - (normalized.length % 4)) : "";
        return atob(normalized + padding);
    }
    
    function parseJwtClaims(jwtToken) {
        try {
            const payload = jwtToken.split(".")[1];
            return JSON.parse(base64UrlToString(payload));
        } catch {
            return null;
        }
    }
    
    function getUserPool() {
        if (typeof window.userPool !== "undefined") return window.userPool;
        // Fallback if you rely on local config:
        return new AmazonCognitoIdentity.CognitoUserPool({
            UserPoolId: "us-east-1_clrYuNqI3",
            ClientId: "3u51gurg8r0ri4riq2isa8aq7h"
        });
    }
    
    function getCognitoUser(emailAddress) {
        const pool = getUserPool();
        return new AmazonCognitoIdentity.CognitoUser({ Username: emailAddress, Pool: pool });
    }
    
    async function postVerify(emailAddress) {
        const response = await fetch("https://api.rocketgeek.org/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: emailAddress })
        });
        if (!response.ok) throw new Error("verify endpoint error");
        return response.json();
    }
    
    // ---------- DOM references ----------
    const dom = {
        // banners
        statusWrapper: byId("verificationStatus"),
        emailVerifiedBanner: byId("emailVerifiedBanner"),
        phoneVerifiedBanner: byId("phoneVerifiedBanner"),
        verifiedEmailValue: byId("verifiedEmailValue"),
        verifiedPhoneValue: byId("verifiedPhoneValue"),
        
        // lookup form
        emailLookupForm: byId("emailLookupForm"),
        emailLookupInput: byId("email"),
        emailLookupButton: byId("btnCheckEmail"),
        
        // email confirm form
        emailConfirmForm: byId("emailConfirmForm"),
        emailConfirmInput: byId("emailConfirm"),
        emailCodeInput: byId("emailCode"),
        emailConfirmButton: byId("btnConfirmEmail"),
        emailResendButton: byId("btnResendEmail"),
        
        // phone confirm form
        phoneConfirmForm: byId("phoneConfirmForm"),
        phoneInput: byId("phone"),
        phoneCodeInput: byId("phoneCode"),
        phoneConfirmButton: byId("btnConfirmPhone"),
        phoneResendButton: byId("btnResendPhone")
    };
    
    // ---------- UI helpers ----------
    function resetToLookupOnly() {
        show(dom.emailLookupForm);
        hide(dom.emailConfirmForm);
        hide(dom.phoneConfirmForm);
        hide(dom.emailVerifiedBanner);
        hide(dom.phoneVerifiedBanner);
        hide(dom.statusWrapper);
    }
    
    function showEmailVerifiedBanner(displayEmail) {
        setText(dom.verifiedEmailValue, displayEmail || "");
        show(dom.emailVerifiedBanner);
        show(dom.statusWrapper);
        hide(dom.emailConfirmForm);
    }
    
    function showPhoneVerifiedBanner(displayPhone) {
        setText(dom.verifiedPhoneValue, displayPhone || "");
        show(dom.phoneVerifiedBanner);
        show(dom.statusWrapper);
    }
    
    function showEmailConfirmSection(prefilledEmail) {
        if (dom.emailConfirmInput) dom.emailConfirmInput.value = prefilledEmail || "";
        hide(dom.emailLookupForm);
        show(dom.emailConfirmForm);
    }
    
    function setPhoneSectionVisibilityForJwt(jwtPresent) {
        if (jwtPresent) show(dom.phoneConfirmForm);
        else hide(dom.phoneConfirmForm);
    }
    
    // ---------- Activity 2: JWT present path ----------
    async function runJwtPresentPath(jwtToken) {
        hide(dom.emailLookupForm);
        
        const claims = parseJwtClaims(jwtToken) || {};
        const emailFromToken = (claims.email || "").trim().toLowerCase();
        const phoneFromToken = claims.phone_number || "";
        const emailVerifiedInToken = !!claims.email_verified;
        const phoneVerifiedInToken = !!claims.phone_number_verified;
        
        let verifiedFromApi = { email_verified: false, phone_verified: false, email: "" };
        if (emailFromToken) {
            try {
                logInfo("JWT path: calling /verify for", emailFromToken);
                verifiedFromApi = await postVerify(emailFromToken);
                logInfo("JWT path: /verify result", verifiedFromApi);
            } catch (error) {
                console.error("[confirm.js] /verify failed (JWT path):", error);
                // Fall back to claims if API temporarily unreachable
            }
        }
        
        const finalEmailVerified = verifiedFromApi.email_verified || emailVerifiedInToken;
        const finalPhoneVerified = verifiedFromApi.phone_verified || phoneVerifiedInToken;
        
        // Email
        if (finalEmailVerified) {
            showEmailVerifiedBanner(verifiedFromApi.email || emailFromToken);
        } else {
            // Not verified → show email confirm section (prefill and allow user to confirm)
            showEmailConfirmSection(emailFromToken);
        }
        
        // Phone (JWT path only)
        if (finalPhoneVerified) {
            showPhoneVerifiedBanner(phoneFromToken);
            hide(dom.phoneConfirmForm);
        } else {
            // Only actionable with JWT/session
            show(dom.phoneConfirmForm);
            if (dom.phoneInput && phoneFromToken) dom.phoneInput.value = phoneFromToken;
        }
    }
    
    // ---------- Activity 3: No-JWT path ----------
    function attachLookupSubmitHandler() {
        if (!dom.emailLookupForm) return;
        
        dom.emailLookupForm.addEventListener("submit", async function onLookupSubmit(event) {
            event.preventDefault();
            const enteredEmail = (dom.emailLookupInput?.value || "").trim().toLowerCase();
            if (!enteredEmail) { alert("Please enter an email address."); return; }
            
            try {
                logInfo("No-JWT path: calling /verify for", enteredEmail);
                const verifyResult = await postVerify(enteredEmail);
                logInfo("No-JWT path: /verify result", verifyResult);
                
                // Email
                if (verifyResult.email_verified) {
                    showEmailVerifiedBanner(verifyResult.email || enteredEmail);
                    hide(dom.phoneConfirmForm); // phone hidden without JWT
                } else {
                    showEmailConfirmSection(enteredEmail);
                    hide(dom.phoneConfirmForm); // phone hidden without JWT
                }
            } catch (error) {
                console.error("[confirm.js] /verify failed (no-JWT path):", error);
                alert("Account lookup failed.");
                resetToLookupOnly();
            }
        });
    }
    
    // ---------- Email confirm + resend (both paths) ----------
    function attachEmailConfirmHandlers() {
        if (dom.emailConfirmForm) {
            dom.emailConfirmForm.addEventListener("submit", function onEmailConfirm(event) {
                event.preventDefault();
                const emailAddress = (dom.emailConfirmInput?.value || "").trim().toLowerCase();
                const confirmationCode = (dom.emailCodeInput?.value || "").trim();
                if (!emailAddress || !confirmationCode) { alert("Enter your confirmation code."); return; }
                
                const userPool = getUserPool();
                if (!userPool) { alert("UserPool not configured."); return; }
                
                const cognitoUser = getCognitoUser(emailAddress);
                cognitoUser.confirmRegistration(confirmationCode, true, function onConfirm(err, result) {
                    if (err) {
                        console.error("[confirm.js] confirmRegistration error:", err);
                        alert(`Email confirmation failed: ${err.message || err}`);
                        return;
                    }
                    logInfo("Email confirmed:", result);
                    showEmailVerifiedBanner(emailAddress);
                    // Keep phone form hidden without JWT
                });
            });
        }
        
        if (dom.emailResendButton) {
            dom.emailResendButton.addEventListener("click", function onResendClick() {
                const emailAddress =
                    (dom.emailConfirmInput?.value || dom.emailLookupInput?.value || "").trim().toLowerCase();
                if (!emailAddress) { alert("Enter your email address first."); return; }
                
                const userPool = getUserPool();
                if (!userPool) { alert("UserPool not configured."); return; }
                
                const cognitoUser = getCognitoUser(emailAddress);
                cognitoUser.resendConfirmationCode(function onResend(err, result) {
                    if (err) {
                        console.error("[confirm.js] resendConfirmationCode error:", err);
                        alert(`Resend failed: ${err.message || err}`);
                        return;
                    }
                    logInfo("Resend result:", result);
                    alert("A new confirmation code has been sent to your email.");
                });
            });
        }
    }
    
    // ---------- Phone confirm + resend (JWT path only) ----------
    function attachPhoneHandlers() {
        if (dom.phoneConfirmForm) {
            dom.phoneConfirmForm.addEventListener("submit", function onPhoneConfirm(event) {
                event.preventDefault();
                alert("Login is required to confirm your phone number.");
            });
        }
        if (dom.phoneResendButton) {
            dom.phoneResendButton.addEventListener("click", function onPhoneResend() {
                alert("Login is required to resend the SMS code.");
            });
        }
    }
    
    // ---------- Activity 1: Entry point ----------
    document.addEventListener("DOMContentLoaded", function onReady() {
        resetToLookupOnly();
        attachLookupSubmitHandler();
        attachEmailConfirmHandlers();
        attachPhoneHandlers();
        
        const jwtToken = getStoredJwt();
        const jwtPresent = !!jwtToken;
        
        // Always start with only the lookup row visible
        setPhoneSectionVisibilityForJwt(jwtPresent);
        
        if (jwtPresent) {
            // JWT path
            runJwtPresentPath(jwtToken).catch(function (error) {
                console.error("[confirm.js] JWT path error:", error);
                // Fallback to no-JWT UI if something goes wrong
                resetToLookupOnly();
                setPhoneSectionVisibilityForJwt(false);
            });
        }
    });
})();
