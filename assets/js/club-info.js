$(document).ready(function() {
    console.log("Document is ready");
    
    $.getJSON("./assets/json-data/club-info.json", function(data) {
        console.log("JSON data loaded", data);
        
        data.forEach(function(club) {
            console.log("Processing club:", club);
            
            let clubItem = `
            <div class="card">
                <div class="card-header" id="heading${club.id}">
                    <h2 class="mb-0">
                        <button class="btn btn-link" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${club.id}" aria-expanded="true" aria-controls="collapse${club.id}" id="btn${club.id}">
                            <span class="plus-sign"></span> ${club.name} (${club.number}) - ${club.city}, ${club.state}
                        </button>
                    </h2>
                </div>
                <div id="collapse${club.id}" class="collapse" aria-labelledby="heading${club.id}" data-parent="#club-list">
                    <div class="card-body">
                        <ul>
                            <li><strong>Name:</strong> ${club.name}</li>
                            <li><strong>Club Number:</strong> ${club.number}</li>
                            <li><strong>Type:</strong> ${club.club_type}</li>
                            <li><strong>City:</strong> ${club.city}</li>
                            <li><strong>State:</strong> ${club.state}</li><li><strong>State:</strong> ${club.state}</li>
                            <li><strong>Website:</strong> <a href="${club.website}" target="_blank">${club.website}</a></li>
                            <li><strong>Launch Site:</strong> ${club.launch_site}</li>
                            <li><strong>Launch Site Location:</strong> ${club.launch_site_location}</li>
                            <li><strong>Club POC:</strong> ${club.club_poc}</li>
                            <li><strong>Contact Email:</strong> <a href="mailto:${club.contact_email}">${club.contact_email}</a></li>
                            <li><strong>Upcoming Events:</strong> ${club.upcoming_events}</li>
                        </ul>
                    </div>
                </div>
            </div>`;
            
            $('#club-list').append(clubItem);
        });
        
        console.log("All clubs processed and added to the DOM");
        
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
