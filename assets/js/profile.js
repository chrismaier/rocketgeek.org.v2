// profile.js


// ==============================
// START: profile.js
// ==============================

document.addEventListener("DOMContentLoaded", async function () {
    console.log("[profile.js] DOM loaded, checking token");
    
    const token = localStorage.getItem("idToken");
    if (!token) {
        console.warn("[profile.js] No token found, redirecting to login");
        window.location.href = "login.html";
        return;
    }
    
    // Decode JWT
    let jwtPayload = null;
    try {
        const parts = token.split(".");
        if (parts.length !== 3) throw new Error("Malformed JWT");
        jwtPayload = JSON.parse(atob(parts[1]));
        console.log("[profile.js] JWT payload:", jwtPayload);
    } catch (err) {
        console.error("[profile.js] Failed to decode JWT:", err);
        return;
    }
    
    // Fetch profile.json from backend
    let profileData = null;
    try {
        const response = await fetch("https://api.rocketgeek.org/get-profile", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });
        
        if (response.status === 404) {
            console.warn("[profile.js] No profile.json found, allowing user to populate from token");
            enableSavePrompt("Welcome! Please complete your profile and click Save.");
            return;
        }
        
        if (!response.ok) {
            throw new Error(`Profile fetch failed with status ${response.status}`);
        }
        
        profileData = await response.json();
        console.log("[profile.js] Loaded profile.json from S3:", profileData);
        
    } catch (err) {
        console.error("[profile.js] Error loading profile.json:", err);
        return;
    }
    
    // Compare JWT to Profile form fields
    const mapping = {
        email: "email",
        given_name: "first_name",
        family_name: "last_name",
        phone_number: "phone",
        "custom:zip_code": "zip_code"
    };
    
    let hasDifferences = false;
    
    for (const jwtField in mapping) {
        const formField = mapping[jwtField];
        const inputEl = document.querySelector(`[name="${formField}"]`);
        if (!inputEl) continue;
        
        const jwtValue = jwtPayload[jwtField] || "";
        const profileValue = profileData[formField] || "";
        
        if (jwtValue && profileValue && jwtValue !== profileValue) {
            console.log(`[profile.js] Mismatch in ${formField}: JWT="${jwtValue}" vs Profile="${profileValue}"`);
            // inputEl.classList.add("border", "border-warning", "bg-warning", "text-dark");
            inputEl.style.backgroundColor = "#f8d7da";  // Bootstrap alert-danger bg color
            inputEl.style.color = "#721c24";            // Bootstrap text-danger color
            inputEl.classList.add("border", "border-danger");
            
            hasDifferences = true;
        }
    }
    
    if (hasDifferences) {
        enableSavePrompt("Some of your profile information has changed. Please review and click Save.");
    }
});

// Utility: Show save message
function enableSavePrompt(message) {
    let messageEl = document.getElementById("profileUpdatePrompt");
    if (!messageEl) {
        messageEl = document.createElement("div");
        messageEl.id = "profileUpdatePrompt";
        messageEl.className = "alert alert-info mt-3";
        messageEl.style.display = "block";
        const form = document.querySelector("form");
        form.parentNode.insertBefore(messageEl, form.nextSibling);
    }
    
    messageEl.textContent = message;
    
    const saveBtn = document.getElementById("saveProfileBtn");
    if (saveBtn) {
        saveBtn.disabled = false;
    }
}

// ==============================
// END: profile.js
// ==============================
