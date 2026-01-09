// load-profile.js

// ==============================
// START: Load Profile Script
// ==============================

document.addEventListener("DOMContentLoaded", async function () {
    console.log("[load-profile] Starting profile load sequence");
    
    const token = localStorage.getItem("idToken");
    if (!token) {
        console.error("[load-profile] No token found in localStorage");
        return;
    }
    
    const jwtClaims = decodeJWT(token);
    if (!jwtClaims) {
        console.error("[load-profile] Failed to decode JWT token");
        return;
    }
    
    showSessionExpiration(jwtClaims);
    
    try {
        const response = await fetch("https://api.rocketgeek.org/get-profile", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const profileData = await response.json();
            console.log("[load-profile] Profile loaded successfully from S3:", profileData);
            populateFormWithProfile(profileData, jwtClaims);
        } else if (response.status === 404) {
            console.warn("[load-profile] No profile found, creating default from token.");
            populateFormWithProfile(null, jwtClaims);
        } else {
            console.error("[load-profile] Error loading profile:", response.status);
        }
    } catch (err) {
        console.error("[load-profile] Exception loading profile:", err);
    }
});

// ==============================
// Helper: Decode JWT Token
// ==============================
function decodeJWT(token) {
    try {
        const parts = token.split(".");
        if (parts.length !== 3) throw new Error("Invalid JWT token");
        return JSON.parse(atob(parts[1]));
    } catch (err) {
        console.error("[load-profile] Failed to decode JWT:", err);
        return null;
    }
}

// ==============================
// Helper: Display Session Expiry
// ==============================
function showSessionExpiration(claims) {
    const exp = claims?.exp;
    const el = document.getElementById("sessionExpiry");
    if (!exp || !el) return;
    
    const expiryDate = new Date(exp * 1000);
    const localTime = expiryDate.toLocaleString();
    el.textContent = `Session expires at: ${localTime}`;
}

// ==============================
// Helper: Populate Form Fields
// ==============================
function populateFormWithProfile(profile, jwtClaims) {
    const fields = {
        username: jwtClaims["cognito:username"] || "",
        email: jwtClaims.email || "",
        first_name: jwtClaims.given_name || "",
        last_name: jwtClaims.family_name || "",
        phone: jwtClaims.phone_number || "",
        zip_code: ""
    };
    
    if (profile) {
        let diffCount = 0;
        
        for (const [field, tokenValue] of Object.entries(fields)) {
            const input = document.getElementById(field);
            if (!input) continue;
            
            const profileValue = profile[field] || "";
            
            input.value = profileValue;
            
            if (profileValue && tokenValue && profileValue !== tokenValue) {
                input.style.backgroundColor = "#ffe6e6";
                input.style.border = "1px solid #cc0000";
                input.title = `Differs from token value: ${tokenValue}`;
                diffCount++;
            } else {
                input.style.backgroundColor = "";
                input.style.border = "";
                input.title = "";
            }
        }
        
        if (diffCount > 0) {
            const notice = document.createElement("div");
            notice.textContent = "Some of your information has changed — please review and click Save.";
            notice.className = "alert alert-warning mt-3";
            const form = document.querySelector("form");
            if (form) {
                form.prepend(notice);
            }
        }
        
    } else {
        for (const [field, value] of Object.entries(fields)) {
            const input = document.getElementById(field);
            if (input) input.value = value;
        }
    }
}

// ==============================
// END: Load Profile Script
// ==============================
