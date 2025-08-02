// ==============================
// START: Profile Dropdown Logic
// ==============================

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
        
        profileNameEl.textContent = "Login to Profile";
        profileLinkEl.href = "login.html";
        dropdownMenuEl.style.display = "none";
        
        return;
    }
    // ------------------------------
    // END: Token Detection Logic
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
        
        const displayName = payload.name || payload.email || "Geek";
        console.log("[top-nav-login-check] Display name set to:", displayName);
        
        profileNameEl.textContent = displayName;
        profileLinkEl.href = "#";
        dropdownMenuEl.style.display = "block";
    } catch (err) {
        console.error("[top-nav-login-check] Token decode failed:", err);
        
        profileNameEl.textContent = "Login to Profile";
        profileLinkEl.href = "login.html";
        dropdownMenuEl.style.display = "none";
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
});

// ==============================
// END: Profile Dropdown Logic
// ==============================
