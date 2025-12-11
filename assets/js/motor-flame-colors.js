// Begin motor flame colors table logic
document.addEventListener("DOMContentLoaded", function () {
    const tableBody = document.querySelector("#flameColorantsTable tbody");
    if (!tableBody) {
        console.error("flameColorantsTable tbody not found in DOM.");
        return;
    }
    
    const indexUrl = "/assets/json-data/flame-colorant-chemicals-index.json";
    
    fetch(indexUrl)
        .then(function (response) {
            if (!response.ok) {
                throw new Error("Failed to load flame colorant index JSON: " + response.status);
            }
            return response.json();
        })
        .then(function (data) {
            if (!data || !Array.isArray(data.chemicals)) {
                console.error("Index JSON does not contain a valid 'chemicals' array.");
                return;
            }
            
            data.chemicals.forEach(function (chemicalEntry) {
                const tableRow = document.createElement("tr");
                
                // Chemical name (clickable)
                const nameCell = document.createElement("td");
                const nameLink = document.createElement("a");
                nameLink.textContent = chemicalEntry.chemical_name || "";
                nameLink.href = chemicalEntry.details_url || "#";
                nameCell.appendChild(nameLink);
                tableRow.appendChild(nameCell);
                
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
                
                // Strong emitter (true/false)
                const strongEmitterCell = document.createElement("td");
                const strongEmitterBadge = document.createElement("span");
                const strongEmitter = Boolean(chemicalEntry.strong_emitter);
                
                strongEmitterBadge.textContent = strongEmitter ? "yes" : "no";
                strongEmitterBadge.className = strongEmitter
                    ? "badge bg-success"
                    : "badge bg-secondary";
                
                strongEmitterCell.appendChild(strongEmitterBadge);
                tableRow.appendChild(strongEmitterCell);
                
                tableBody.appendChild(tableRow);
            });
        })
        .catch(function (error) {
            console.error("Error loading or rendering flame colorant index:", error);
        });
});
// End motor flame colors table logic
