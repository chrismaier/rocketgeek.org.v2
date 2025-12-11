// Begin query string helper functions
function getQueryParameterValue(parameterName) {
    const urlSearchParams = new URLSearchParams(window.location.search);
    return urlSearchParams.get(parameterName);
}

function isValidJsonFileName(fileName) {
    if (typeof fileName !== "string") {
        return false;
    }
    // Only allow lower-case letters, digits, dashes, and ".json" suffix
    const fileNamePattern = /^[a-z0-9-]+\.json$/;
    return fileNamePattern.test(fileName);
}
// End query string helper functions

// Begin badge rendering helpers
function createCompatibilityBadge(apcpCompatibility) {
    const badgeElement = document.createElement("span");
    const compatibilityValue = apcpCompatibility || "unknown";
    
    badgeElement.textContent = compatibilityValue;
    
    if (compatibilityValue === "suitable") {
        badgeElement.className = "badge bg-success";
    } else if (compatibilityValue === "limited") {
        badgeElement.className = "badge bg-warning text-dark";
    } else if (compatibilityValue === "unsuitable") {
        badgeElement.className = "badge bg-danger";
    } else {
        badgeElement.className = "badge bg-secondary";
    }
    
    return badgeElement;
}

function createSaturationBadge(colorSaturation) {
    const badgeElement = document.createElement("span");
    const saturationValue = colorSaturation || "unknown";
    
    badgeElement.textContent = saturationValue;
    
    if (saturationValue === "high") {
        badgeElement.className = "badge bg-primary";
    } else if (saturationValue === "medium") {
        badgeElement.className = "badge bg-info text-dark";
    } else if (saturationValue === "low") {
        badgeElement.className = "badge bg-secondary";
    } else {
        badgeElement.className = "badge bg-light text-dark";
    }
    
    return badgeElement;
}

function createStrongEmitterBadge(isStrongEmitter) {
    const badgeElement = document.createElement("span");
    const strongEmitterValue = Boolean(isStrongEmitter);
    
    badgeElement.textContent = strongEmitterValue ? "yes" : "no";
    badgeElement.className = strongEmitterValue ? "badge bg-success" : "badge bg-secondary";
    
    return badgeElement;
}
// End badge rendering helpers

// Begin procurement rendering helpers
function renderProcurementSources(containerElement, procurementSources) {
    if (!Array.isArray(procurementSources) || procurementSources.length === 0) {
        const noDataParagraph = document.createElement("p");
        noDataParagraph.textContent = "No procurement sources are listed for this chemical.";
        containerElement.appendChild(noDataParagraph);
        return;
    }
    
    const listElement = document.createElement("ul");
    listElement.className = "list-unstyled";
    
    procurementSources.forEach(function (sourceEntry) {
        const listItem = document.createElement("li");
        listItem.className = "mb-2";
        
        const vendorName = sourceEntry.vendor_name || "Unknown vendor";
        const vendorUrl = sourceEntry.url || "";
        const minimumOrderQuantity = sourceEntry.minimum_order_quantity;
        const minimumOrderUnit = sourceEntry.minimum_order_unit || "";
        const typicalPurity = sourceEntry.typical_purity || "";
        const acquisitionRestrictions = sourceEntry.acquisition_restrictions || "";
        const notes = sourceEntry.notes || "";
        
        const vendorHeader = document.createElement("strong");
        if (vendorUrl) {
            const vendorLink = document.createElement("a");
            vendorLink.href = vendorUrl;
            vendorLink.target = "_blank";
            vendorLink.rel = "noopener noreferrer";
            vendorLink.textContent = vendorName;
            vendorHeader.appendChild(vendorLink);
        } else {
            vendorHeader.textContent = vendorName;
        }
        
        listItem.appendChild(vendorHeader);
        
        const detailsParagraph = document.createElement("div");
        detailsParagraph.className = "small";
        
        if (minimumOrderQuantity !== null && minimumOrderQuantity !== undefined && minimumOrderUnit) {
            const moqSpan = document.createElement("span");
            moqSpan.textContent = " | MOQ: " + minimumOrderQuantity + " " + minimumOrderUnit;
            detailsParagraph.appendChild(moqSpan);
        }
        
        if (typicalPurity) {
            const puritySpan = document.createElement("span");
            puritySpan.textContent = " | Purity: " + typicalPurity;
            detailsParagraph.appendChild(puritySpan);
        }
        
        if (acquisitionRestrictions) {
            const restrictionsSpan = document.createElement("span");
            restrictionsSpan.textContent = " | Restrictions: " + acquisitionRestrictions;
            detailsParagraph.appendChild(restrictionsSpan);
        }
        
        if (notes) {
            const notesSpan = document.createElement("span");
            notesSpan.textContent = " | Notes: " + notes;
            detailsParagraph.appendChild(notesSpan);
        }
        
        listItem.appendChild(detailsParagraph);
        listElement.appendChild(listItem);
    });
    
    containerElement.appendChild(listElement);
}
// End procurement rendering helpers

// Begin main render logic
document.addEventListener("DOMContentLoaded", function () {
    const titleElement = document.getElementById("chemicalDetailTitle");
    const contentElement = document.getElementById("chemicalDetailContent");
    
    if (!titleElement || !contentElement) {
        console.error("Chemical detail container elements not found.");
        return;
    }
    
    const fileParameter = getQueryParameterValue("file");
    
    if (!isValidJsonFileName(fileParameter)) {
        titleElement.textContent = "Propellant Colorant Details";
        const errorParagraph = document.createElement("p");
        errorParagraph.textContent = "No valid chemical file was specified in the URL.";
        contentElement.appendChild(errorParagraph);
        return;
    }
    
    const jsonUrl = "/assets/json-data/" + fileParameter;
    
    fetch(jsonUrl)
        .then(function (response) {
            if (!response.ok) {
                throw new Error("Failed to load chemical JSON file: " + response.status);
            }
            return response.json();
        })
        .then(function (chemicalData) {
            // Heading
            const chemicalName = chemicalData.chemical_name || "Unknown chemical";
            titleElement.textContent = chemicalName;
            
            // Summary card container
            const summaryCard = document.createElement("div");
            summaryCard.className = "card mb-3";
            
            const summaryBody = document.createElement("div");
            summaryBody.className = "card-body";
            
            // Flame color line
            const flameColorParagraph = document.createElement("p");
            flameColorParagraph.innerHTML = "<strong>Flame color:</strong> " +
                (chemicalData.flame_color || "unknown");
            summaryBody.appendChild(flameColorParagraph);
            
            // APCP compatibility, saturation, strong emitter badges
            const badgeRow = document.createElement("p");
            
            const compatibilityLabel = document.createElement("span");
            compatibilityLabel.innerHTML = "<strong>APCP compatibility:</strong> ";
            badgeRow.appendChild(compatibilityLabel);
            badgeRow.appendChild(
                createCompatibilityBadge(chemicalData.apcp_compatibility)
            );
            
            const spacingSpanOne = document.createElement("span");
            spacingSpanOne.textContent = "  ";
            badgeRow.appendChild(spacingSpanOne);
            
            const saturationLabel = document.createElement("span");
            saturationLabel.innerHTML = "<strong>Color saturation:</strong> ";
            badgeRow.appendChild(saturationLabel);
            badgeRow.appendChild(
                createSaturationBadge(chemicalData.color_saturation)
            );
            
            const spacingSpanTwo = document.createElement("span");
            spacingSpanTwo.textContent = "  ";
            badgeRow.appendChild(spacingSpanTwo);
            
            const strongEmitterLabel = document.createElement("span");
            strongEmitterLabel.innerHTML = "<strong>Strong emitter:</strong> ";
            badgeRow.appendChild(strongEmitterLabel);
            badgeRow.appendChild(
                createStrongEmitterBadge(chemicalData.strong_emitter)
            );
            
            summaryBody.appendChild(badgeRow);
            
            // Notes
            if (chemicalData.notes) {
                const notesParagraph = document.createElement("p");
                notesParagraph.innerHTML = "<strong>Notes:</strong> " + chemicalData.notes;
                summaryBody.appendChild(notesParagraph);
            }
            
            summaryCard.appendChild(summaryBody);
            contentElement.appendChild(summaryCard);
            
            // Procurement section
            const procurementHeader = document.createElement("h3");
            procurementHeader.className = "h5 mt-3";
            procurementHeader.textContent = "Procurement Sources";
            contentElement.appendChild(procurementHeader);
            
            const procurementContainer = document.createElement("div");
            renderProcurementSources(procurementContainer, chemicalData.procurement_sources);
            contentElement.appendChild(procurementContainer);
        })
        .catch(function (error) {
            console.error("Error loading chemical detail JSON:", error);
            titleElement.textContent = "Propellant Colorant Details";
            const errorParagraph = document.createElement("p");
            errorParagraph.textContent = "There was a problem loading the chemical details.";
            contentElement.appendChild(errorParagraph);
        });
});
// End main render logic
