// Begin motor flame colors table logic
console.log("motor-flame-colors.js: script file loaded and evaluated.");

document.addEventListener("DOMContentLoaded", function () {
    console.log("motor-flame-colors.js: DOMContentLoaded fired.");
    
    const tableElement = document.getElementById("flameColorantsTable");
    if (!tableElement) {
        console.error("motor-flame-colors.js: #flameColorantsTable not found in DOM.");
        return;
    }
    
    const tableBody = tableElement.querySelector("tbody");
    if (!tableBody) {
        console.error("motor-flame-colors.js: <tbody> not found inside #flameColorantsTable.");
        return;
    }
    
    const indexUrl = "/assets/json-data/flame-colorant-chemicals-index.json";
    console.log("motor-flame-colors.js: attempting to fetch index from:", indexUrl);
    
    fetch(indexUrl)
        .then(function (response) {
            console.log("motor-flame-colors.js: fetch response status:", response.status);
            if (!response.ok) {
                throw new Error("Failed to load flame colorant index JSON: " + response.status);
            }
            return response.json();
        })
        .then(function (indexData) {
            console.log("motor-flame-colors.js: index JSON parsed:", indexData);
            
            if (!indexData || !Array.isArray(indexData.chemicals)) {
                console.error("motor-flame-colors.js: 'chemicals' array missing or invalid in index JSON.");
                return;
            }
            
            indexData.chemicals.forEach(function (chemicalEntry, entryIndex) {
                console.log("motor-flame-colors.js: rendering entry", entryIndex, chemicalEntry);
                
                const tableRow = document.createElement("tr");
                
                // Chemical name (clickable)
                const nameCell = document.createElement("td");
                const nameLink = document.createElement("a");
                nameLink.textContent = chemicalEntry.chemical_name || "";
                nameLink.href = chemicalEntry.details_url || "#";
                nameCell.appendChild(nameLink);
                tableRow.appendChild(nameCell);
                
                // Flame color (simple value: red, violet, orange, etc.)
                const colorCell = document.createElement("td");
                const flameColorValue = chemicalEntry.flame_color || "unknown";
                colorCell.textContent = flameColorValue;
                tableRow.appendChild(colorCell);
                
                // APCP compatibility
                const compatibilityCell = document.createElement("td");
                const compatibilityBadge = document.createElement("span");
                const compatibility = chemicalEntry.apcp_compatibility || "unknown";
                
                compatibilityBadge.textContent = compatibility;
                
                if (compatibility === "suitable") {
                    compatibilityBadge.className = "badge bg-success";
                } else if (compatibility === "limited") {
                    compatibilityBadge.className = "badge bg-warning text-dark";
                } else if (compatibility === "unsuitable") {
                    compatibilityBadge.className = "badge bg-danger";
                } else {
                    compatibilityBadge.className = "badge bg-secondary";
                }
                
                compatibilityCell.appendChild(compatibilityBadge);
                tableRow.appendChild(compatibilityCell);
                
                // Color saturation
                const saturationCell = document.createElement("td");
                const saturationBadge = document.createElement("span");
                const saturation = chemicalEntry.color_saturation || "unknown";
                
                saturationBadge.textContent = saturation;
                
                if (saturation === "high") {
                    saturationBadge.className = "badge bg-primary";
                } else if (saturation === "medium") {
                    saturationBadge.className = "badge bg-info text-dark";
                } else if (saturation === "low") {
                    saturationBadge.className = "badge bg-secondary";
                } else {
                    saturationBadge.className = "badge bg-light text-dark";
                }
                
                saturationCell.appendChild(saturationBadge);
                tableRow.appendChild(saturationCell);
                
                // Strong emitter (yes/no)
                const strongEmitterCell = document.createElement("td");
                const strongEmitterBadge = document.createElement("span");
                const strongEmitterValue = Boolean(chemicalEntry.strong_emitter);
                
                strongEmitterBadge.textContent = strongEmitterValue ? "yes" : "no";
                strongEmitterBadge.className = strongEmitterValue
                    ? "badge bg-success"
                    : "badge bg-secondary";
                
                strongEmitterCell.appendChild(strongEmitterBadge);
                tableRow.appendChild(strongEmitterCell);
                
                tableBody.appendChild(tableRow);
            });
            
            console.log("motor-flame-colors.js: finished rendering table rows.");
        })
        .catch(function (error) {
            console.error("motor-flame-colors.js: error loading or rendering flame colorant index:", error);
        });
});
// End motor flame colors table logic
