/* Begin motor-flame-colors.js */

/* Begin configuration */
const flameColorantIndexUrl = "/assets/json-data/flame-colorant-chemicals-index.json";

/**
 * This must match the <tbody> id in your existing HTML.
 * The markup you provided uses:
 *
 *   <tbody id="colorant-matrix-body"></tbody>
 */
const tableBodyElementId = "colorant-matrix-body";
/* End configuration */

/* Begin utility functions */

/**
 * Begin addTextCell
 * Create a basic text cell and append it to the row.
 */
function addTextCell(rowElement, textContent) {
    const cellElement = rowElement.insertCell();
    cellElement.textContent = textContent ?? "";
}
/* End addTextCell */

/**
 * Begin addLinkCell
 * Create a link cell for the chemical name.
 */
function addLinkCell(rowElement, linkText, hrefValue) {
    const cellElement = rowElement.insertCell();
    const anchorElement = document.createElement("a");
    
    anchorElement.textContent = linkText ?? "";
    anchorElement.href = hrefValue || "#";
    
    cellElement.appendChild(anchorElement);
}
/* End addLinkCell */

/**
 * Begin createCompatibilityBadge
 * Create a small label for APCP compatibility.
 * Styling is minimal so your existing site CSS / Bootstrap
 * controls the final look (no grid lines or corner changes here).
 */
function createCompatibilityBadge(compatibilityValue) {
    const spanElement = document.createElement("span");
    const normalizedValue = (compatibilityValue || "").toLowerCase();
    
    spanElement.textContent = compatibilityValue || "unknown";
    
    // Minimal, standard Bootstrap-style classes.
    // Your existing CSS already defines how these look.
    spanElement.classList.add("badge");
    
    if (normalizedValue === "suitable") {
        spanElement.classList.add("bg-success");
    } else if (normalizedValue === "limited") {
        spanElement.classList.add("bg-warning", "text-dark");
    } else if (normalizedValue === "unsuitable") {
        spanElement.classList.add("bg-danger");
    } else {
        spanElement.classList.add("bg-secondary");
    }
    
    return spanElement;
}
/* End createCompatibilityBadge */

/**
 * Begin formatStrongEmitterLabel
 * Turn the boolean strong_emitter flag into human text.
 */
function formatStrongEmitterLabel(strongEmitterFlag) {
    if (strongEmitterFlag === true) {
        return "Yes";
    }
    if (strongEmitterFlag === false) {
        return "No";
    }
    return "Unknown";
}
/* End formatStrongEmitterLabel */

/**
 * Begin formatBurnContributionLabel
 * Make burn_contribution readable for humans.
 */
function formatBurnContributionLabel(burnContribution) {
    if (!burnContribution) {
        return "";
    }
    
    const normalizedValue = burnContribution.toLowerCase();
    
    if (normalizedValue === "oxidizer") {
        return "Oxidizer";
    }
    if (normalizedValue === "color_donor") {
        return "Color donor";
    }
    if (normalizedValue === "inert_filler") {
        return "Inert / filler";
    }
    if (normalizedValue === "burn_inhibitor") {
        return "Burn inhibitor";
    }
    if (normalizedValue === "binder_like") {
        return "Binder-like contribution";
    }
    
    const fallbackLabel = normalizedValue
        .replace(/_/g, " ")
        .replace(/^\w/, function (firstCharacter) {
            return firstCharacter.toUpperCase();
        });
    
    return fallbackLabel;
}
/* End formatBurnContributionLabel */

/* End utility functions */

/* Begin rendering logic */

/**
 * Begin renderFlameColorantMatrix
 * Populate the table body from the index JSON data.
 *
 * Column order MUST match your <thead>:
 *  1. Chemical
 *  2. Flame color
 *  3. Color density
 *  4. Color saturation
 *  5. Burn role
 *  6. APCP compatibility
 *  7. Strong emitter
 */
function renderFlameColorantMatrix(chemicalList) {
    const tableBodyElement = document.getElementById(tableBodyElementId);
    
    if (!tableBodyElement) {
        console.error(
            "motor-flame-colors.js: Could not find table body with id:",
            tableBodyElementId
        );
        return;
    }
    
    // Clear existing rows
    while (tableBodyElement.firstChild) {
        tableBodyElement.removeChild(tableBodyElement.firstChild);
    }
    
    if (!Array.isArray(chemicalList) || chemicalList.length === 0) {
        const placeholderRow = tableBodyElement.insertRow();
        const placeholderCell = placeholderRow.insertCell();
        // You have 7 columns in the header
        placeholderCell.colSpan = 7;
        placeholderCell.textContent = "No flame colorant data available.";
        return;
    }
    
    for (let index = 0; index < chemicalList.length; index++) {
        const chemicalItem = chemicalList[index];
        const rowElement = tableBodyElement.insertRow();
        
        // 1. Chemical (clickable)
        addLinkCell(
            rowElement,
            chemicalItem.chemical_name,
            chemicalItem.details_url || "#"
        );
        
        // 2. Flame color
        addTextCell(rowElement, chemicalItem.flame_color);
        
        // 3. Color density
        addTextCell(rowElement, chemicalItem.color_density);
        
        // 4. Color saturation
        addTextCell(rowElement, chemicalItem.color_saturation);
        
        // 5. Burn role (burn_contribution)
        addTextCell(
            rowElement,
            formatBurnContributionLabel(chemicalItem.burn_contribution)
        );
        
        // 6. APCP compatibility (badge)
        const compatibilityCell = rowElement.insertCell();
        const compatibilityBadge = createCompatibilityBadge(
            chemicalItem.apcp_compatibility
        );
        compatibilityCell.appendChild(compatibilityBadge);
        
        // 7. Strong emitter
        addTextCell(
            rowElement,
            formatStrongEmitterLabel(chemicalItem.strong_emitter)
        );
    }
}
/* End renderFlameColorantMatrix */

/**
 * Begin loadFlameColorantIndex
 * Fetch the index JSON and hand off to the renderer.
 */
function loadFlameColorantIndex() {
    fetch(flameColorantIndexUrl, { cache: "no-cache" })
        .then(function handleResponse(responseObject) {
            if (!responseObject.ok) {
                throw new Error("HTTP error " + responseObject.status);
            }
            return responseObject.json();
        })
        .then(function handleJson(responseData) {
            const chemicalList = Array.isArray(responseData.chemicals)
                ? responseData.chemicals
                : [];
            renderFlameColorantMatrix(chemicalList);
        })
        .catch(function handleError(errorObject) {
            console.error(
                "motor-flame-colors.js: Failed to load index JSON:",
                errorObject
            );
        });
}
/* End loadFlameColorantIndex */

/* End rendering logic */

/* Begin event wiring */
document.addEventListener("DOMContentLoaded", function handleDomReady() {
    loadFlameColorantIndex();
});
/* End event wiring */

/* End motor-flame-colors.js */
