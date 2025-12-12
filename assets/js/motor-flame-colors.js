/* Begin motor-flame-colors.js */

const flameColorantIndexUrl = "/assets/json-data/flame-colorant-chemicals-index.json";
const tableBodyElementId = "colorant-matrix-body";

/* Begin pill creation helpers */

function createPill(label, className) {
    const span = document.createElement("span");
    span.textContent = label ?? "";
    span.classList.add("fct-pill");
    if (className) {
        span.classList.add(className);
    }
    return span;
}

/* Begin pillForFlameColor */
function pillForFlameColor(color) {
    const normalizedColor = (color || "").toLowerCase();
    
    if (normalizedColor === "red") {
        return createPill(color, "fct-red");
    }
    if (normalizedColor === "orange") {
        return createPill(color, "fct-orange");
    }
    if (normalizedColor === "yellow") {
        return createPill(color, "fct-yellow");
    }
    if (normalizedColor === "green") {
        return createPill(color, "fct-green");
    }
    if (normalizedColor === "blue") {
        return createPill(color, "fct-blue");
    }
    if (normalizedColor === "violet") {
        return createPill(color, "fct-violet");
    }
    
    return createPill(color || "n/a", "fct-gray");
}
/* End pillForFlameColor */

/* Begin pillForDensity */
/**
 * Map:
 *   pale   -> low (fct-low)
 *   normal -> medium (fct-medium)
 *   deep / blue-tinged -> high (fct-high)
 * Anything else -> gray
 */
function pillForDensity(level) {
    const normalizedLevel = (level || "").toLowerCase();
    
    if (normalizedLevel === "pale") {
        return createPill(level, "fct-low");
    }
    if (normalizedLevel === "normal") {
        return createPill(level, "fct-medium");
    }
    if (normalizedLevel === "deep" || normalizedLevel === "blue-tinged") {
        return createPill(level, "fct-high");
    }
    
    return createPill(level || "n/a", "fct-gray");
}
/* End pillForDensity */

/* Begin pillForSaturation */
/**
 * saturation is already low / medium / high in your data,
 * so we can map directly to fct-low / fct-medium / fct-high.
 */
function pillForSaturation(level) {
    const normalizedLevel = (level || "").toLowerCase();
    
    if (normalizedLevel === "low") {
        return createPill(level, "fct-low");
    }
    if (normalizedLevel === "medium") {
        return createPill(level, "fct-medium");
    }
    if (normalizedLevel === "high") {
        return createPill(level, "fct-high");
    }
    
    return createPill(level || "n/a", "fct-gray");
}
/* End pillForSaturation */

/* Begin pillForEmitter */
function pillForEmitter(value) {
    if (value === true) {
        return createPill("Yes", "fct-high");
    }
    if (value === false) {
        return createPill("No", "fct-low");
    }
    return createPill("Unknown", "fct-gray");
}
/* End pillForEmitter */

/* Begin pillForCompatibility */
function pillForCompatibility(value) {
    const normalized = (value || "").toLowerCase();
    
    if (normalized === "suitable") {
        return createPill("Suitable", "fct-green");
    }
    if (normalized === "limited") {
        return createPill("Limited", "fct-yellow");
    }
    if (normalized === "unsuitable") {
        return createPill("Unsuitable", "fct-red");
    }
    
    return createPill("Unknown", "fct-gray");
}
/* End pillForCompatibility */

/* Begin pillForBurnRole */
function pillForBurnRole(role) {
    const normalizedRole = (role || "").toLowerCase();
    
    if (normalizedRole === "oxidizer") {
        return createPill("Oxidizer", "fct-role-oxidizer");
    }
    if (normalizedRole === "color_donor") {
        return createPill("Color donor", "fct-role-color");
    }
    if (normalizedRole === "inert_filler") {
        return createPill("Inert filler", "fct-role-inert");
    }
    if (normalizedRole === "burn_inhibitor") {
        return createPill("Burn inhibitor", "fct-role-inhibitor");
    }
    if (normalizedRole === "binder_like") {
        return createPill("Binder-like", "fct-role-binder");
    }
    
    return createPill(role || "n/a", "fct-gray");
}
/* End pillForBurnRole */

/* End pill creation helpers */

/* Begin rendering logic */

function renderFlameColorantMatrix(chemicalList) {
    const tableBodyElement = document.getElementById(tableBodyElementId);
    if (!tableBodyElement) {
        console.error(
            "motor-flame-colors.js: Could not find table body with id:",
            tableBodyElementId
        );
        return;
    }
    
    tableBodyElement.innerHTML = "";
    
    if (!Array.isArray(chemicalList) || chemicalList.length === 0) {
        const placeholderRow = tableBodyElement.insertRow();
        const placeholderCell = placeholderRow.insertCell();
        placeholderCell.colSpan = 7;
        placeholderCell.textContent = "No flame colorant data available.";
        return;
    }
    
    chemicalList.forEach(function (chemicalItem) {
        const rowElement = tableBodyElement.insertRow();
        
        // Column order matches your <thead>:
        // 1. Chemical
        // 2. Flame color
        // 3. Color density
        // 4. Color saturation
        // 5. Burn role
        // 6. APCP compatibility
        // 7. Strong emitter
        
        // 1. Chemical (clickable)
        const nameCell = rowElement.insertCell();
        const anchorElement = document.createElement("a");
        anchorElement.textContent = chemicalItem.chemical_name ?? "";
        anchorElement.href = chemicalItem.details_url || "#";
        nameCell.appendChild(anchorElement);
        
        // 2. Flame color
        const flameColorCell = rowElement.insertCell();
        flameColorCell.appendChild(pillForFlameColor(chemicalItem.flame_color));
        
        // 3. Color density
        const densityCell = rowElement.insertCell();
        densityCell.appendChild(pillForDensity(chemicalItem.color_density));
        
        // 4. Color saturation
        const saturationCell = rowElement.insertCell();
        saturationCell.appendChild(pillForSaturation(chemicalItem.color_saturation));
        
        // 5. Burn role
        const burnRoleCell = rowElement.insertCell();
        burnRoleCell.appendChild(pillForBurnRole(chemicalItem.burn_contribution));
        
        // 6. APCP compatibility
        const compatibilityCell = rowElement.insertCell();
        compatibilityCell.appendChild(
            pillForCompatibility(chemicalItem.apcp_compatibility)
        );
        
        // 7. Strong emitter
        const emitterCell = rowElement.insertCell();
        emitterCell.appendChild(pillForEmitter(chemicalItem.strong_emitter));
    });
}

/* End rendering logic */

/* Begin data loading */

function loadFlameColorantIndex() {
    fetch(flameColorantIndexUrl, { cache: "no-cache" })
        .then(function (responseObject) {
            if (!responseObject.ok) {
                throw new Error("HTTP error " + responseObject.status);
            }
            return responseObject.json();
        })
        .then(function (responseData) {
            const chemicalList = Array.isArray(responseData.chemicals)
                ? responseData.chemicals
                : [];
            renderFlameColorantMatrix(chemicalList);
        })
        .catch(function (errorObject) {
            console.error(
                "motor-flame-colors.js: Failed to load index JSON:",
                errorObject
            );
        });
}

/* End data loading */

/* Begin event wiring */

document.addEventListener("DOMContentLoaded", function () {
    loadFlameColorantIndex();
});

/* End event wiring */

/* End motor-flame-colors.js */
