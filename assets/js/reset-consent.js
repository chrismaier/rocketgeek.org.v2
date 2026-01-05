/* START: Reset consent cookies (dev/test only) */
(function () {
    console.warn("[reset-consent.js] Loaded — DO NOT include in production!");
    
    function clearConsentCookies() {
        const cookiesToClear = ["rg_cookie_accepted", "rg_tos_version", "rg_sms_accepted"];
        cookiesToClear.forEach(name => {
            document.cookie = encodeURIComponent(name) + "=; Path=/; Secure; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
            console.log(`[reset-consent.js] Cleared cookie: ${name}`);
        });
        alert("Consent cookies cleared.\nReloading page...");
        window.location.reload();
    }
    
    // Add a visible reset button (Bootstrap styling)
    const btn = document.createElement("button");
    btn.textContent = "Reset Consent (Dev)";
    btn.className = "btn btn-warning m-3";
    btn.style.position = "fixed";
    btn.style.bottom = "20px";
    btn.style.right = "20px";
    btn.style.zIndex = "9999";
    
    btn.addEventListener("click", clearConsentCookies);
    
    document.body.appendChild(btn);
})();
/* END: Reset consent cookies (dev/test only) */
