/* Begin motor-color-chemical-details.js */

/* Begin configuration */
const detailJsonBasePath = "/assets/json-data/";
const detailContainerElementId = "colorant-detail-container";
/* End configuration */

/* Begin helper: query string parsing */
function getQueryParameter(parameterName) {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const rawValue = urlSearchParams.get(parameterName);
    return rawValue !== null ? rawValue : "";
}
/* End helper: query string parsing */

/* Begin DOM helpers */
function getDetailContainer() {
    const containerElement = document.getElementById(detailContainerElementId);
    if (!containerElement) {
        console.error(
            "motor-color-chemical-details.js: Missing detail container with id:",
            detailContainerElementId
        );
    }
    return containerElement;
}

function clearContainer(containerElement) {
    if (!containerElement) {
        return;
    }
    while (containerElement.firstChild) {
        containerElement.removeChild(containerElement.firstChild);
    }
}

function createSectionTitle(titleText, headingLevel) {
    const effectiveHeadingLevel = headingLevel || "h4";
    const headingElement = document.createElement(effectiveHeadingLevel);
    headingElement.textContent = titleText;
    return headingElement;
}
/* End DOM helpers */

/* Begin shared emission strength text helper */
/*
   Normalized mapping:
   - "strong" or true    => "Strong"
   - "moderate"          => "Moderate"
   - "weak" or false     => "Weak"
   - everything else     => "Unknown"
*/

/*
function emissionStrengthText(strongEmitterField) {
    const rawValue = strongEmitterField;
    
    // Allow future string-based levels
    if (typeof rawValue === "string") {
        const normalized = rawValue.toLowerCase().trim();
        if (normalized === "strong") {
            return "Strong";
        }
        if (normalized === "moderate") {
            return "Moderate";
        }
        if (normalized === "weak") {
            return "Weak";
        }
        return "Unknown";
    }
    
    // Current schema: boolean or null
    if (rawValue === true) {
        return "Strong";
    }
    if (rawValue === false) {
        return "Weak";
    }
    
    // null / undefined / anything else
    return "Unknown";
}
*/

function emissionStrengthText(rawValue) {
    
    // Support future string levels first
    if (typeof rawValue === "string") {
        const normalized = rawValue.toLowerCase().trim();
        if (normalized === "strong")   return "Strong";
        if (normalized === "moderate") return "Moderate";
        if (normalized === "weak")     return "Weak";
        return "Unknown";
    }
    
    // Support current schema (boolean)
    if (rawValue === true)  return "Strong";
    if (rawValue === false) return "Weak";
    
    return "Unknown";
}
/* End shared emission strength text helper */


/* End shared emission strength text helper */

/* Begin pill helpers (matching matrix styles) */
function createPill(labelText, className) {
    const pillElement = document.createElement("span");
    pillElement.textContent = labelText ?? "";
    pillElement.classList.add("fct-pill");
    if (className) {
        pillElement.classList.add(className);
    }
    return pillElement;
}

function pillForFlameColor(colorValue) {
    const normalizedColorValue = (colorValue || "").toLowerCase();
    
    if (normalizedColorValue === "red") {
        return createPill(colorValue, "fct-red");
    }
    if (normalizedColorValue === "orange") {
        return createPill(colorValue, "fct-orange");
    }
    if (normalizedColorValue === "yellow") {
        return createPill(colorValue, "fct-yellow");
    }
    if (normalizedColorValue === "green") {
        return createPill(colorValue, "fct-green");
    }
    if (normalizedColorValue === "blue") {
        return createPill(colorValue, "fct-blue");
    }
    if (normalizedColorValue === "violet") {
        return createPill(colorValue, "fct-violet");
    }
    
    return createPill(colorValue || "n/a", "fct-gray");
}

function pillForSaturation(levelValue) {
    const normalizedLevelValue = (levelValue || "").toLowerCase();
    
    if (normalizedLevelValue === "low") {
        return createPill(levelValue, "fct-low");
    }
    if (normalizedLevelValue === "medium") {
        return createPill(levelValue, "fct-medium");
    }
    if (normalizedLevelValue === "high") {
        return createPill(levelValue, "fct-high");
    }
    
    return createPill(levelValue || "n/a", "fct-gray");
}

function pillForDensity(levelValue) {
    const normalizedLevelValue = (levelValue || "").toLowerCase();
    
    if (normalizedLevelValue === "pale") {
        return createPill(levelValue, "fct-low");
    }
    if (normalizedLevelValue === "normal") {
        return createPill(levelValue, "fct-medium");
    }
    if (normalizedLevelValue === "deep" || normalizedLevelValue === "blue-tinged") {
        return createPill(levelValue, "fct-high");
    }
    
    return createPill(levelValue || "n/a", "fct-gray");
}

/*
function pillForEmitter(strongEmitterField) {
    const label = emissionStrengthText(strongEmitterField);
    let intensityClass = "fct-gray";
    
    if (label === "Strong") {
        intensityClass = "fct-high";
    } else if (label === "Moderate") {
        intensityClass = "fct-medium";
    } else if (label === "Weak") {
        intensityClass = "fct-low";
    } else {
        intensityClass = "fct-gray";
    }
    
    return createPill(label, intensityClass);
}
*/

function pillForEmitter(rawValue) {
    const label = emissionStrengthText(rawValue);
    
    let intensityClass = "fct-gray";
    if (label === "Strong")   intensityClass = "fct-high";
    if (label === "Moderate") intensityClass = "fct-medium";
    if (label === "Weak")     intensityClass = "fct-low";
    
    return createPill(label, intensityClass);
}


function pillForCompatibility(compatibilityValue) {
    const normalizedCompatibilityValue = (compatibilityValue || "").toLowerCase();
    
    if (normalizedCompatibilityValue === "suitable") {
        return createPill("APCP: Suitable", "fct-green");
    }
    if (normalizedCompatibilityValue === "limited") {
        return createPill("APCP: Limited", "fct-yellow");
    }
    if (normalizedCompatibilityValue === "unsuitable") {
        return createPill("APCP: Unsuitable", "fct-red");
    }
    
    return createPill("APCP: Unknown", "fct-gray");
}

function pillForBurnRole(burnContributionValue) {
    const normalizedBurnContribution = (burnContributionValue || "").toLowerCase();
    
    if (normalizedBurnContribution === "oxidizer") {
        return createPill("Burn role: Oxidizer", "fct-role-oxidizer");
    }
    if (normalizedBurnContribution === "color_donor") {
        return createPill("Burn role: Color donor", "fct-role-color");
    }
    if (normalizedBurnContribution === "inert_filler") {
        return createPill("Burn role: Inert filler", "fct-role-inert");
    }
    if (normalizedBurnContribution === "burn_inhibitor") {
        return createPill("Burn role: Burn inhibitor", "fct-role-inhibitor");
    }
    if (normalizedBurnContribution === "binder_like") {
        return createPill("Burn role: Binder-like", "fct-role-binder");
    }
    
    return createPill("Burn role: n/a", "fct-gray");
}
/* End pill helpers */

/* Begin table row helpers */
function addSummaryTableRow(tableElement, labelText, valueNode) {
    const rowElement = document.createElement("tr");
    
    const labelCellElement = document.createElement("td");
    labelCellElement.classList.add("colorant-detail-cell-label");
    labelCellElement.textContent = labelText;
    
    const valueCellElement = document.createElement("td");
    valueCellElement.classList.add("colorant-detail-cell-value");
    if (valueNode) {
        valueCellElement.appendChild(valueNode);
    }
    
    rowElement.appendChild(labelCellElement);
    rowElement.appendChild(valueCellElement);
    tableElement.appendChild(rowElement);
}

function addKeyPropertyTableRow(tableElement, labelText, valueText) {
    const rowElement = document.createElement("tr");
    
    const labelCellElement = document.createElement("td");
    labelCellElement.classList.add("colorant-detail-cell-label");
    labelCellElement.textContent = labelText;
    
    const valueCellElement = document.createElement("td");
    valueCellElement.classList.add(
        "colorant-detail-cell-value",
        "colorant-detail-key-cell-value"
    );
    valueCellElement.textContent = valueText;
    
    rowElement.appendChild(labelCellElement);
    rowElement.appendChild(valueCellElement);
    tableElement.appendChild(rowElement);
}
/* End table row helpers */

/* Begin main render */
function renderChemicalDetails(chemicalData) {
    const outerContainerElement = getDetailContainer();
    if (!outerContainerElement) {
        return;
    }
    
    clearContainer(outerContainerElement);
    
    // Outer card: 3px rounded border around everything
    const cardElement = document.createElement("div");
    cardElement.classList.add("colorant-detail-card");
    
    // Header with chemical name + formula
    const headerElement = document.createElement("div");
    const nameHeadingElement = document.createElement("h3");
    const compoundParagraphElement = document.createElement("p");
    
    nameHeadingElement.textContent = chemicalData.chemical_name || "Unknown chemical";
    compoundParagraphElement.textContent = chemicalData.chemical_compound || "";
    
    headerElement.appendChild(nameHeadingElement);
    headerElement.appendChild(compoundParagraphElement);
    cardElement.appendChild(headerElement);
    
    /* Summary section – pills in right column, inner bordered box with table */
    const summarySectionElement = document.createElement("div");
    summarySectionElement.classList.add("colorant-detail-section");
    
    const summaryTitleElement = createSectionTitle("Summary", "h4");
    summarySectionElement.appendChild(summaryTitleElement);
    
    const summaryTableElement = document.createElement("table");
    summaryTableElement.classList.add("colorant-detail-table");
    
    addSummaryTableRow(
        summaryTableElement,
        "Flame color",
        pillForFlameColor(chemicalData.flame_color)
    );
    
    addSummaryTableRow(
        summaryTableElement,
        "Color density",
        pillForDensity(chemicalData.color_density)
    );
    
    addSummaryTableRow(
        summaryTableElement,
        "Color saturation",
        pillForSaturation(chemicalData.color_saturation)
    );
    
    addSummaryTableRow(
        summaryTableElement,
        "Burn role",
        pillForBurnRole(chemicalData.burn_contribution)
    );
    
    addSummaryTableRow(
        summaryTableElement,
        "APCP compatibility",
        pillForCompatibility(chemicalData.apcp_compatibility)
    );
    
    addSummaryTableRow(
        summaryTableElement,
        "Emission strength",
        pillForEmitter(chemicalData.strong_emitter)
    );
    
    summarySectionElement.appendChild(summaryTableElement);
    cardElement.appendChild(summarySectionElement);
    
    /* Key properties – similar table layout, plain text on the right */
    const keyPropertiesSectionElement = document.createElement("div");
    keyPropertiesSectionElement.classList.add("colorant-detail-section");
    
    const propertiesTitleElement = createSectionTitle("Key properties", "h4");
    keyPropertiesSectionElement.appendChild(propertiesTitleElement);
    
    const keyPropertiesTableElement = document.createElement("table");
    keyPropertiesTableElement.classList.add("colorant-detail-table");
    
    const flameColorDescription =
        (chemicalData.flame_color || "unknown") +
        " (" +
        (chemicalData.color_density || "unknown density") +
        ", " +
        (chemicalData.color_saturation || "unknown saturation") +
        ")";
    addKeyPropertyTableRow(
        keyPropertiesTableElement,
        "Flame behavior",
        flameColorDescription
    );
    
    if (chemicalData.burn_contribution) {
        addKeyPropertyTableRow(
            keyPropertiesTableElement,
            "Burn role",
            chemicalData.burn_contribution
        );
    }
    
    if (chemicalData.burn_modification) {
        addKeyPropertyTableRow(
            keyPropertiesTableElement,
            "Burn modification",
            chemicalData.burn_modification
        );
    }
    
    if (typeof chemicalData.hygroscopic === "boolean") {
        addKeyPropertyTableRow(
            keyPropertiesTableElement,
            "Hygroscopic",
            chemicalData.hygroscopic ? "yes" : "no"
        );
    }
    
    if (chemicalData.physical_form) {
        addKeyPropertyTableRow(
            keyPropertiesTableElement,
            "Physical form",
            chemicalData.physical_form
        );
    }
    
    if (chemicalData.apcp_compatibility) {
        addKeyPropertyTableRow(
            keyPropertiesTableElement,
            "APCP compatibility",
            chemicalData.apcp_compatibility
        );
    }
    
    if (typeof chemicalData.strong_emitter !== "undefined") {
        addKeyPropertyTableRow(
            keyPropertiesTableElement,
            "Emission strength",
            emissionStrengthText(chemicalData.strong_emitter)
        );
    }
    
    if (chemicalData.notes) {
        addKeyPropertyTableRow(
            keyPropertiesTableElement,
            "Notes",
            chemicalData.notes
        );
    }
    
    keyPropertiesSectionElement.appendChild(keyPropertiesTableElement);
    cardElement.appendChild(keyPropertiesSectionElement);
    
    /* Procurement sources – list inside the outer card (no table layout) */
    if (Array.isArray(chemicalData.procurement_sources) &&
        chemicalData.procurement_sources.length > 0) {
        
        const procurementSectionElement = document.createElement("div");
        procurementSectionElement.classList.add("colorant-detail-section");
        
        const procurementTitleElement = createSectionTitle(
            "Representative procurement sources",
            "h4"
        );
        procurementSectionElement.appendChild(procurementTitleElement);
        
        const procurementListElement = document.createElement("ul");
        
        for (let index = 0; index < chemicalData.procurement_sources.length; index++) {
            const sourceItem = chemicalData.procurement_sources[index];
            const listItemElement = document.createElement("li");
            
            const lineParts = [];
            
            if (sourceItem.vendor_name) {
                lineParts.push(sourceItem.vendor_name);
            }
            if (sourceItem.typical_purity) {
                lineParts.push("purity: " + sourceItem.typical_purity);
            }
            if (sourceItem.minimum_order_quantity && sourceItem.minimum_order_unit) {
                lineParts.push(
                    "MOQ: " +
                    sourceItem.minimum_order_quantity +
                    " " +
                    sourceItem.minimum_order_unit
                );
            }
            if (sourceItem.acquisition_restrictions) {
                lineParts.push(
                    "restrictions: " + sourceItem.acquisition_restrictions
                );
            }
            
            const combinedText = lineParts.join(" | ");
            
            if (sourceItem.url) {
                const linkElement = document.createElement("a");
                linkElement.href = sourceItem.url;
                linkElement.target = "_blank";
                linkElement.rel = "noopener noreferrer";
                linkElement.textContent = combinedText || sourceItem.url;
                listItemElement.appendChild(linkElement);
            } else {
                listItemElement.textContent =
                    combinedText || "Source details unavailable";
            }
            
            if (sourceItem.notes) {
                const notesElement = document.createElement("div");
                notesElement.textContent = sourceItem.notes;
                notesElement.classList.add("small");
                listItemElement.appendChild(notesElement);
            }
            
            procurementListElement.appendChild(listItemElement);
        }
        
        procurementSectionElement.appendChild(procurementListElement);
        cardElement.appendChild(procurementSectionElement);
    }
    
    /* Metadata footer */
    if (chemicalData.last_updated) {
        const metaParagraphElement = document.createElement("p");
        metaParagraphElement.classList.add("small", "text-muted", "mb-0");
        metaParagraphElement.textContent =
            "Record last updated: " + chemicalData.last_updated;
        cardElement.appendChild(metaParagraphElement);
    }
    
    outerContainerElement.appendChild(cardElement);
}
/* End main render */

/* Begin error handling */
function renderDetailError(messageText) {
    const outerContainerElement = getDetailContainer();
    if (!outerContainerElement) {
        return;
    }
    
    clearContainer(outerContainerElement);
    
    const cardElement = document.createElement("div");
    cardElement.classList.add("colorant-detail-card");
    
    const alertElement = document.createElement("div");
    alertElement.classList.add("alert", "alert-warning", "mb-0");
    alertElement.textContent = messageText;
    
    cardElement.appendChild(alertElement);
    outerContainerElement.appendChild(cardElement);
}
/* End error handling */

/* Begin data loading */
function loadChemicalDetail() {
    const fileName = getQueryParameter("file");
    
    if (!fileName) {
        renderDetailError(
            "No chemical file specified. Please navigate here from the colorant matrix."
        );
        return;
    }
    
    if (fileName.indexOf("/") !== -1 || fileName.indexOf("\\") !== -1) {
        renderDetailError("Invalid file parameter.");
        return;
    }
    
    const jsonUrl = detailJsonBasePath + fileName;
    
    fetch(jsonUrl, { cache: "no-cache" })
        .then(function (responseObject) {
            if (!responseObject.ok) {
                throw new Error("HTTP " + responseObject.status);
            }
            return responseObject.json();
        })
        .then(function (chemicalData) {
            renderChemicalDetails(chemicalData);
        })
        .catch(function (errorObject) {
            console.error(
                "motor-color-chemical-details.js: Failed to load chemical JSON:",
                errorObject
            );
            renderDetailError(
                "Unable to load chemical details. Please check the link or try again later."
            );
        });
}
/* End data loading */

/* Begin event wiring */
document.addEventListener("DOMContentLoaded", function () {
    loadChemicalDetail();
});
/* End event wiring */

/* End motor-color-chemical-details.js */
