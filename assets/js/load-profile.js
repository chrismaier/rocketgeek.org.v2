// ==============================
// START: Load Profile Form Logic
// ==============================

document.addEventListener("DOMContentLoaded", async function () {
    console.log("[load-profile] DOMContentLoaded triggered");
    
    const token = localStorage.getItem("idToken");
    if (!token) {
        console.warn("[load-profile] No token found. Redirecting to login.");
        window.location.href = "login.html";
        return;
    }
    
    const jwtPayload = decodeJwtPayload(token);
    if (!jwtPayload) {
        console.error("[load-profile] Invalid JWT token.");
        console.log("[load-profile] Email:", jwtPayload.email);
        console.log("[load-profile] Cognito User ID (sub):", jwtPayload.sub);
        return;
    }
    
    let profileData = null;
    let isNewProfile = false;
    
    try {
        const response = await fetch("https://api.rocketgeek.org/get-profile", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        
        if (response.status === 404) {
            console.info("[load-profile] No profile found, creating default from token.");
            isNewProfile = true;
            profileData = {}; // will fill from token only
        } else if (!response.ok) {
            throw new Error("Failed to load profile: " + response.status);
        } else {
            profileData = await response.json();
        }
    } catch (err) {
        console.error("[load-profile] Error fetching profile:", err);
        return;
    }
    
    // Merge and render fields
    let showSavePrompt = false;
    const mappings = [
        { id: "username", profileKey: "username", jwtKey: "nickname" },
        { id: "email", profileKey: "email", jwtKey: "email" },
        { id: "first_name", profileKey: "first_name", jwtKey: "given_name" },
        { id: "last_name", profileKey: "last_name", jwtKey: "family_name" },
        { id: "phone", profileKey: "phone_number", jwtKey: "phone_number" },
        { id: "zip_code", profileKey: "custom:zip_code", jwtKey: "custom:zip_code" }
    ];
    
    for (const map of mappings) {
        const el = document.getElementById(map.id);
        if (!el) continue;
        
        const fromProfile = profileData?.[map.profileKey];
        const fromJwt = jwtPayload?.[map.jwtKey];
        
        // Priority: profile > JWT
        if (fromProfile !== undefined) {
            el.value = fromProfile;
        } else if (fromJwt !== undefined) {
            el.value = fromJwt;
        }
        
        // Check for difference
        if (fromProfile !== undefined && fromJwt !== undefined && fromProfile !== fromJwt) {
            el.classList.add("border", "border-warning", "bg-light");
            showSavePrompt = true;
        }
        
        // If new profile and JWT has value
        if (isNewProfile && fromJwt !== undefined) {
            el.value = fromJwt;
        }
    }
    
    if (isNewProfile) {
        showBanner("Welcome! Let’s save your new profile to get started.", "info");
    } else if (showSavePrompt) {
        showBanner("Some fields differ from your current login. Please save to update.", "warning");
    }
    
    function decodeJwtPayload(token) {
        try {
            const base64 = token.split(".")[1];
            return JSON.parse(atob(base64));
        } catch (e) {
            console.error("[load-profile] Failed to decode JWT:", e);
            return null;
        }
    }
    
    function showBanner(message, type = "info") {
        const banner = document.createElement("div");
        banner.className = `alert alert-${type} mt-3`;
        banner.role = "alert";
        banner.textContent = message;
        const formCard = document.querySelector(".card-body form");
        if (formCard) {
            formCard.parentElement.insertBefore(banner, formCard);
        }
    }
});

// ==============================
// END: Load Profile Form Logic
// ==============================
