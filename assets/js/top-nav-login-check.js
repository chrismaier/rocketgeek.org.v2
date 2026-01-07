// ==============================
// START: Profile Dropdown Logic
// ==============================
// top-nav-login-check.js

document.addEventListener("DOMContentLoaded", async function () {
    console.log("[top-nav-login-check] DOMContentLoaded triggered");
    
    const profileNameEl = document.getElementById("profileName");
    const profileLinkEl = document.getElementById("profileLink");
    const dropdownMenuEl = document.getElementById("profileDropdown");
    const logoutLinkEl = document.getElementById("logoutLink");
    
    if (!profileNameEl || !profileLinkEl || !dropdownMenuEl) {
        console.error("[top-nav-login-check] Required DOM elements not found.");
        return;
    }
    
    // ------------------------------
    // START: Token Detection Logic
    // ------------------------------
    const token = localStorage.getItem("idToken");
    console.log("[top-nav-login-check] Token presence:", token ? "FOUND" : "NOT FOUND");
    
    if (!token) {
        console.log("[top-nav-login-check] No token detected, setting login prompt");
        setLoggedOutUI();
        return;
    }
    
    // ------------------------------
    // START: API Validation of Token
    // ------------------------------
    try {
        const authHeader = `Bearer ${token}`;
        console.log("[top-nav-login-check] Sending Authorization:", authHeader);
        
        const response = await fetch("https://api.rocketgeek.org/authenticated", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": authHeader
            }
        });
        
        if (!response.ok) {
            throw new Error("Token validation request failed with status: " + response.status);
        }
        
        const result = await response.json();
        console.log("[top-nav-login-check] /authenticated response:", result);
        
        if (!result.authenticated) {
            console.warn("[top-nav-login-check] Token was rejected by backend");
            setLoggedOutUI();
            return;
        }
        
    } catch (err) {
        console.error("[top-nav-login-check] Error calling /authenticated:", err);
        setLoggedOutUI();
        return;
    }
    // ------------------------------
    // END: API Validation of Token
    // ------------------------------
    
    // ------------------------------
    // START: Token Decoding + UI Update
    // ------------------------------
    try {
        const parts = token.split(".");
        if (parts.length !== 3) {
            throw new Error("Malformed JWT token");
        }
        
        const payload = JSON.parse(atob(parts[1]));
        console.log("[top-nav-login-check] Decoded token payload:", payload);
        
        const displayName = payload.given_name || payload.name || payload.email || "Geek";
        console.log("[top-nav-login-check] Display name set to:", displayName);
        
        profileNameEl.textContent = displayName;
        profileLinkEl.href = "#";
        profileLinkEl.setAttribute("data-bs-toggle", "dropdown");
        dropdownMenuEl.style.display = "block";
        
        const expTimestamp = payload.exp;
        if (expTimestamp) {
            const expDate = new Date(expTimestamp * 1000);
            const formattedExp = expDate.toLocaleString();
            const sessionInfo = document.getElementById("sessionExpiration");
            
            if (sessionInfo) {
                sessionInfo.textContent = `Session expires: ${formattedExp}`;
            } else {
                console.warn("[top-nav-login-check] No sessionExpiration element found");
            }
        }
        
        
    } catch (err) {
        console.error("[top-nav-login-check] Token decode failed:", err);
        setLoggedOutUI();
        return;
    }
    // ------------------------------
    // END: Token Decoding + UI Update
    // ------------------------------
    
    // ------------------------------
    // START: Logout Link Logic
    // ------------------------------
    if (logoutLinkEl) {
        logoutLinkEl.addEventListener("click", function () {
            console.log("[top-nav-login-check] Logout initiated");
            localStorage.removeItem("idToken");
            console.log("[top-nav-login-check] Token removed from localStorage");
            window.location.href = "index.html";
        });
    } else {
        console.warn("[top-nav-login-check] Logout link element not found");
    }
    // ------------------------------
    // END: Logout Link Logic
    // ------------------------------
    
    // ------------------------------
    // START: Shared Logged-Out Handler
    // ------------------------------
    function setLoggedOutUI() {
        console.log("[top-nav-login-check] Executing setLoggedOutUI()");
        profileNameEl.textContent = "Login to Profile";
        profileLinkEl.href = "login.html";
        profileLinkEl.removeAttribute("data-bs-toggle");
        dropdownMenuEl.style.display = "none";
        localStorage.removeItem("idToken");
    }
    // ------------------------------
    // END: Shared Logged-Out Handler
    // ------------------------------
});

// ==============================
// END: Profile Dropdown Logic
// ==============================
