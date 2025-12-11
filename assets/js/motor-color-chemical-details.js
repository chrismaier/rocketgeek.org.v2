// Begin motor color chemical details logic
console.log("motor-color-chemical-details.js: script file loaded and evaluated.");

document.addEventListener("DOMContentLoaded", function () {
    console.log("motor-color-chemical-details.js: DOMContentLoaded fired.");
    
    const contentElement = document.getElementById("chemicalDetailsContent");
    if (!contentElement) {
        console.error("motor-color-chemical-details.js: #chemicalDetailsContent not found in DOM.");
        return;
    }
    
    // Begin helper functions
    function getQueryParameter(parameterName) {
        const urlParameters = new URLSearchParams(window.location.search);
        return urlParameters.get(parameterName);
    }
    
    function createCardElement() {
        const cardElement = document.createElement("div");
        cardElement.className = "card mb-3";
        return cardElement;
    }
    
    function createCardBodyElement() {
        const cardBodyElement = document.createElement("div");
        cardBodyElement.className = "card-body";
        return cardBodyElement;
    }
    
    function createHeadingElement(level, textContent) {
        const headingElement = document.createElement(level);
        headingElement.textContent = textContent;
        return headingElement;
    }
    
    function createListElement() {
        const listElement = document.createElement("ul");
        listElement.className = "list-unstyled mb-0";
        return listElement;
    }
    
    function appendBullet(listElement, labelText, valueText) {
        if (valueText === undefined || valueText === null || valueText === "") {
            return;
        }
        const listItemElement = document.createElement("li");
        listItemElement.innerHTML = "<strong>" + labelText + ":</strong> " + valueText;
        listElement.appendChild(listItemElement);
    }
    
    function renderProcurementSources(parentElement, sourcesArray) {
        if (!Array.isArray(sourcesArray) || sourcesArray.length === 0) {
            return;
        }
        
        const cardElement = createCardElement();
        const cardBodyElement = createCardBodyElement();
        
        const headingElement = createHeadingElement("h5", "Procurement sources");
        headingElement.classList.add("card-title", "mb-3");
        cardBodyElement.appendChild(headingElement);
        
        const listElement = document.createElement("ul");
        listElement.className = "mb-0";
        
        sourcesArray.forEach(function (sourceItem, sourceIndex) {
            const listItemElement = document.createElement("li");
            
            const vendorName = sourceItem.vendor_name || "Vendor";
            const vendorUrl = sourceItem.url || "";
            const vendorLinkElement = document.createElement("a");
            vendorLinkElement.textContent = vendorName;
            if (vendorUrl) {
                vendorLinkElement.href = vendorUrl;
                vendorLinkElement.target = "_blank";
                vendorLinkElement.rel = "noopener noreferrer";
            } else {
                vendorLinkElement.href = "#";
            }
            
            const detailsParts = [];
            
            if (sourceItem.minimum_order_quantity !== undefined && sourceItem.minimum_order_unit) {
                detailsParts.push(
                    "MOQ: " +
                    String(sourceItem.minimum_order_quantity) +
                    " " +
                    sourceItem.minimum_order_unit
                );
            }
            
            if (sourceItem.typical_purity) {
                detailsParts.push("Typical purity: " + sourceItem.typical_purity);
            }
            
            if (sourceItem.acquisition_restrictions) {
                detailsParts.push("Restrictions: " + sourceItem.acquisition_restrictions);
            }
            
            if (sourceItem.notes) {
                detailsParts.push("Notes: " + sourceItem.notes);
            }
            
            listItemElement.appendChild(vendorLinkElement);
            
            if (detailsParts.length > 0) {
                const detailsParagraphElement = document.createElement("div");
                detailsParagraphElement.className = "small text-muted";
                detailsParagraphElement.textContent = detailsParts.join(" | ");
                listItemElement.appendChild(document.createElement("br"));
                listItemElement.appendChild(detailsParagraphElement);
            }
            
            listElement.appendChild(listItemElement);
        });
        
        cardBodyElement.appendChild(listElement);
        cardElement.appendChild(cardBodyElement);
        parentElement.appendChild(cardElement);
    }
    // End helper functions
    
    // Begin main flow
    const fileParameter = getQueryParameter("file");
    if (!fileParameter) {
        const warningParagraphElement = document.createElement("p");
        warningParagraphElement.className = "text-warning";
        warningParagraphElement.textContent =
            "No chemical file specified. Please navigate here from the matrix page.";
        contentElement.appendChild(warningParagraphElement);
        return;
    }
    
    const jsonUrl = "/assets/json-data/" + fileParameter;
    console.log("motor-color-chemical-details.js: attempting to fetch JSON from:", jsonUrl);
    
    fetch(jsonUrl)
        .then(function (response) {
            console.log("motor-color-chemical-details.js: fetch response status:", response.status);
            if (!response.ok) {
                throw new Error("Failed to load chemical JSON: " + response.status);
            }
            return response.json();
        })
        .then(function (chemicalData) {
            console.log("motor-color-chemical-details.js: parsed chemical JSON:", chemicalData);
            
            const summaryCardElement = createCardElement();
            const summaryCardBodyElement = createCardBodyElement();
            
            const titleText =
                chemicalData.chemical_name || chemicalData.reference_id || "Chemical details";
            const titleElement = createHeadingElement("h4", titleText);
            titleElement.classList.add("card-title", "mb-3");
            summaryCardBodyElement.appendChild(titleElement);
            
            const bulletListElement = createListElement();
            
            // Flame color + density + saturation bullet
            const flameColor = chemicalData.flame_color || "unknown";
            const colorDensity = chemicalData.color_density || "";
            const colorSaturation = chemicalData.color_saturation || "";
            
            const flameParts = [];
            flameParts.push(flameColor);
            if (colorDensity) {
                flameParts.push(colorDensity);
            }
            if (colorSaturation) {
                flameParts.push("saturation " + colorSaturation);
            }
            const flameDescriptor = flameParts.join(" – ");
            
            appendBullet(bulletListElement, "Flame color", flameDescriptor);
            
            // APCP compatibility
            appendBullet(
                bulletListElement,
                "APCP compatibility",
                chemicalData.apcp_compatibility || "unknown"
            );
            
            // Strong emitter
            const strongEmitterFlag = Boolean(chemicalData.strong_emitter);
            appendBullet(
                bulletListElement,
                "Strong emitter",
                strongEmitterFlag ? "yes" : "no"
            );
            
            // Hygroscopic
            if (chemicalData.hygroscopic === true || chemicalData.hygroscopic === false) {
                appendBullet(
                    bulletListElement,
                    "Hygroscopic",
                    chemicalData.hygroscopic ? "yes" : "no"
                );
            }
            
            // Burn contribution and modification
            appendBullet(
                bulletListElement,
                "Burn contribution",
                chemicalData.burn_contribution || ""
            );
            appendBullet(
                bulletListElement,
                "Burn modification",
                chemicalData.burn_modification || ""
            );
            
            // Physical form
            appendBullet(
                bulletListElement,
                "Physical form",
                chemicalData.physical_form || ""
            );
            
            // Notes
            appendBullet(
                bulletListElement,
                "Notes",
                chemicalData.notes || ""
            );
            
            summaryCardBodyElement.appendChild(bulletListElement);
            summaryCardElement.appendChild(summaryCardBodyElement);
            contentElement.appendChild(summaryCardElement);
            
            // Procurement sources
            if (Array.isArray(chemicalData.procurement_sources)) {
                renderProcurementSources(contentElement, chemicalData.procurement_sources);
            }
        })
        .catch(function (error) {
            console.error("motor-color-chemical-details.js: error loading or rendering details:", error);
            const errorParagraphElement = document.createElement("p");
            errorParagraphElement.className = "text-danger";
            errorParagraphElement.textContent =
                "There was a problem loading the chemical details. Please try again later.";
            contentElement.appendChild(errorParagraphElement);
        });
    // End main flow
});
// End motor color chemical details logic
