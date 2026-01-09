// motor-inventory.js


$(document).ready(function () {
    console.log("Document is ready");
    
    // === Safe accessor helper ===
    function safe(value, fallback = "") {
        return (value !== undefined && value !== null) ? value : fallback;
    }
    
    // === Determine motor category for filtering ===
    function getMotorCategory(motor) {
        const manufacturer = safe(motor.manufacturer).toLowerCase();
        const desc = safe(motor.description).toLowerCase();
        
        if (manufacturer.includes("cti") || manufacturer.includes("cesaroni")) return "cti";
        if (manufacturer.includes("aerotech")) {
            if (desc.includes("rms")) return "aerotech_rms";
            if (desc.includes("dms")) return "aerotech_dms";
        }
        return "other";
    }
    
    let requestData = {}; // fallback data for requests
    
    // === Load motor-requests.json ===
    $.getJSON("/assets/json-data/motor-requests.json")
        .done(function (requests) {
            console.log("Motor Requests Loaded:", requests);
            requestData = requests;
        })
        .fail(function (jqxhr, textStatus, error) {
            console.warn("motor-requests.json could not be loaded. Proceeding without request data.", textStatus, error);
            requestData = {}; // fallback to empty
        })
        .always(function () {
            // === Load motor-inventory.json ===
            $.getJSON("/assets/json-data/motor-inventory.json")
                .done(function (motorData) {
                    console.log("Motor Inventory Loaded:", motorData);
                    
                    motorData.forEach(function (motor) {
                        let motorHeadingStatus = "none";
                        let motorDetailStatus = "none";
                        
                        if (safe(motor.date_flown) !== "") {
                            motorHeadingStatus = "motor-status-used";
                            motorDetailStatus = "motor-details-used";
                        }
                        
                        // === Generate Requested By HTML ===
                        let requestedByHTML = "";
                        const requestEntry = requestData[safe(motor.inventoryID)];
                        if (requestEntry && Array.isArray(requestEntry.requested_by)) {
                            const people = requestEntry.requested_by.map(user => {
                                const userLink = `<a href="/profile.html?user_id=${safe(user.user_id)}">${safe(user.display_name)}</a>`;
                                const clubLink = `<a href="/club-profile.html?club_id=${safe(user.club_id)}">${safe(user.club_name)}</a>`;
                                return `${userLink} (from ${clubLink})`;
                            });
                            requestedByHTML = `<li><strong>Requested By:</strong> ${people.join(", ")}</li>`;
                        }
                        
                        // === Determine claim status ===
                        const isClaimed = !!(requestedByHTML || safe(motor.reserved_for) !== "");
                        
                        // === Determine filter category ===
                        const motorCategory = getMotorCategory(motor);
                        
                        // === Build motor card ===
                        let motorItem = `
                        <div class="card motor-card" data-category="${motorCategory}" data-claimed="${isClaimed}">
                            <div class="card-header" id="heading${safe(motor.inventoryID)}">
                                <h2 class="mb-0" style="${motorHeadingStatus}">
                                    <button class="btn btn-link" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${safe(motor.inventoryID)}" aria-expanded="true" aria-controls="collapse${safe(motor.inventoryID)}" id="btn${safe(motor.inventoryID)}">
                                        <span class="plus-sign"></span> ${safe(motor.manufacturer)} - ${safe(motor.case_diameter)}mm - ${safe(motor.classification)}${isClaimed ? " **" : ""}
                                    </button>
                                </h2>
                            </div>
                            <div id="collapse${safe(motor.inventoryID)}" class="collapse" aria-labelledby="heading${safe(motor.inventoryID)}" data-parent="#motor-list">
                                <div class="card-body" style="${motorDetailStatus}">
                                    <ul>
                                        <li><strong>Manufacturer:</strong> ${safe(motor.manufacturer)}</li>
                                        <li><strong>Manufacturer ID:</strong> ${safe(motor.manufacturerID)}</li>
                                        <li><strong>Quantity:</strong> ${safe(motor.quantity)}</li>
                                        <li><strong>Case Diameter:</strong> ${safe(motor.case_diameter)}</li>
                                        <li><strong>Grains:</strong> ${safe(motor.grains)}</li>
                                        <li><strong>Grain Type:</strong> ${safe(motor.grain_type)}</li>
                                        <li><strong>Total Impulse:</strong> ${safe(motor.total_impulse)}</li>
                                        <li><strong>Classification:</strong> ${safe(motor.classification)}</li>
                                        <li><strong>Color:</strong> ${safe(motor.color)}</li>
                                        <li><strong>Burn Time:</strong> ${safe(motor.burn_time)}</li>
                                        <li><strong>Vendor Data Sheet:</strong> <a href="${safe(motor.vendor_data_sheet, "#")}" target="_blank">(Click here)</a></li>
                                        <li><strong>Description:</strong> ${safe(motor.description)}</li>
                                        <li><strong>Reloadable:</strong> ${safe(motor.reloadable)}</li>
                                        <li><strong>Manufactured:</strong> ${safe(motor.manufacture_date)}</li>
                                        <li><strong>Flown:</strong> ${safe(motor.date_flown)}</li>
                                        ${requestedByHTML}
                                        <li><strong>Reserved By:</strong> ${safe(motor.reserved_for)}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>`;
                        
                        $('#motor-list').append(motorItem);
                    });
                    
                    console.log("All motors processed and added to the DOM");
                    
                    // === Expand/collapse icon toggles ===
                    $('[id^=btn]').click(function () {
                        console.log(`Button ${this.id} clicked`);
                    });
                    
                    $('.collapse').on('show.bs.collapse', function () {
                        $(this).prev('.card-header').find('.plus-sign').removeClass('plus-sign').addClass('minus-sign');
                    }).on('hide.bs.collapse', function () {
                        $(this).prev('.card-header').find('.minus-sign').removeClass('minus-sign').addClass('plus-sign');
                    });
                    
                    // === Start: Apply Filter Logic ===
                    function applyFilters() {
                        const typeFilter = $('#motorFilter').val();
                        const claimFilter = $('#claimedFilter').val();
                        let visibleCount = 0;
                        
                        $('.motor-card').each(function () {
                            const category = $(this).data('category');
                            const claimed = $(this).data('claimed') === true || $(this).data('claimed') === "true";
                            
                            const matchesType = (typeFilter === 'all' || typeFilter === category);
                            const matchesClaim = (
                                claimFilter === 'all' ||
                                (claimFilter === 'claimed' && claimed) ||
                                (claimFilter === 'unclaimed' && !claimed)
                            );
                            
                            if (matchesType && matchesClaim) {
                                $(this).show();
                                visibleCount++;
                            } else {
                                $(this).hide();
                            }
                        });
                        
                        // === Show or hide "No Motors" alert ===
                        if (visibleCount === 0) {
                            $('#noMotorsAlert').removeClass('d-none');
                        } else {
                            $('#noMotorsAlert').addClass('d-none');
                        }
                    }
// === End: Apply Filter Logic ===
                    
                    // === Filter change event listeners ===
                    $('#motorFilter, #claimedFilter').on('change', applyFilters);
                })
                .fail(function (jqxhr, textStatus, error) {
                    console.error("Failed to load motor-inventory.json", textStatus, error);
                });
        });
});
