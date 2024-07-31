$(document).ready(function() {
    console.log("Document is ready");
    
    $.getJSON("/assets/json-data/motor-inventory.json", function(data) {
        console.log("JSON data loaded", data);
        
        data.forEach(function(motor) {
            console.log("Processing motor:", motor);
            
            let motorItem = `
            <div class="card">
                <div class="card-header" id="heading${motor.inventoryID}">
                    <h2 class="mb-0">
                        <button class="btn btn-link" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${motor.inventoryID}" aria-expanded="true" aria-controls="collapse${motor.inventoryID}" id="btn${motor.inventoryID}">
                            <span class="plus-sign"></span> ${motor.manufacturer} - ${motor.case_diameter} - ${motor.classification}
                        </button>
                    </h2>
                </div>
                <div id="collapse${motor.inventoryID}" class="collapse" aria-labelledby="heading${motor.inventoryID}" data-parent="#motor-list">
                    <div class="card-body">
                        <ul>
                            <li><strong>Manufacturer:</strong> ${motor.manufacturer}</li>
                            <li><strong>Quantity:</strong> ${motor.quantity}</li>
                            <li><strong>Case Diameter:</strong> ${motor.case_diameter}</li>
                            <li><strong>Grains:</strong> ${motor.grains}</li>
                            <li><strong>Grain Type:</strong> ${motor.grain_type}</li>
                            <li><strong>Total Impulse:</strong> ${motor.total_impulse}</li>
                            <li><strong>Classification:</strong> ${motor.classification}</li>
                            <li><strong>Color:</strong> ${motor.color}</li>
                            <li><strong>Burn Time:</strong> ${motor.burn_time}</li>
                            <li><strong>Vendor Data Sheet:</strong> <a href="${motor.vendor_data_sheet}" target="_blank">${motor.vendor_data_sheet}</a></li>
                            <li><strong>Description:</strong> ${motor.description}</li>
                            <li><strong>Reloadable:</strong> ${motor.reloadable}</li>
                        </ul>
                    </div>
                </div>
            </div>`;
            
            $('#motor-list').append(motorItem);
        });
        
        console.log("All motors processed and added to the DOM");
        
        // Add event listeners to buttons
        $('[id^=btn]').click(function() {
            console.log(`Button ${this.id} clicked`);
        });
        
        // Add event listeners to toggle plus/minus signs
        $('.collapse').on('show.bs.collapse', function() {
            $(this).prev('.card-header').find('.plus-sign').removeClass('plus-sign').addClass('minus-sign');
        }).on('hide.bs.collapse', function() {
            $(this).prev('.card-header').find('.minus-sign').removeClass('minus-sign').addClass('plus-sign');
        });
    }).fail(function(jqxhr, textStatus, error) {
        console.error("Error loading JSON data", textStatus, error);
    });
});
