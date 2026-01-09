// college-clubs.js

$(document).ready(function () {
    console.log("Loading College & HS Clubs");
    
    $.getJSON("/assets/json-data/college-clubs.json", function (data) {
        console.log("College Clubs JSON loaded", data);
        
        data.forEach(function (club) {
            let teamNumberLine = '';
            if (club.team_number) {
                if (typeof club.team_number === 'object' && club.team_number.value) {
                    if (club.team_number.link) {
                        teamNumberLine = `<li><strong>Team Number:</strong> <a href="${club.team_number.link}" target="_blank">${club.team_number.value}</a></li>`;
                    } else {
                        teamNumberLine = `<li><strong>Team Number:</strong> ${club.team_number.value}</li>`;
                    }
                } else if (typeof club.team_number === 'string') {
                    teamNumberLine = `<li><strong>Team Number:</strong> ${club.team_number}</li>`;
                }
            }
            
            let associatedLaunchClubsLine = '';
            if (club.associated_launch_clubs && club.associated_launch_clubs.length > 0) {
                associatedLaunchClubsLine = `<li><strong>Launch Club(s):</strong> `;
                associatedLaunchClubsLine += club.associated_launch_clubs.map(lc => {
                    return `<a href="${lc.website}" target="_blank">${lc.name}</a>`;
                }).join(", ");
                associatedLaunchClubsLine += `</li>`;
            }
            
            let upcomingEventsLine = '';
            if (Array.isArray(club.upcoming_events)) {
                upcomingEventsLine = `<li><strong>Upcoming Events:</strong> `;
                upcomingEventsLine += club.upcoming_events.map(event => {
                    if (event.link) {
                        return `<a href="${event.link}" target="_blank">${event.name}</a>`;
                    } else {
                        return event.name;
                    }
                }).join(", ");
                upcomingEventsLine += `</li>`;
            }
            
            let clubItem = `
            <div class="card">
                <div class="card-header" id="headingCollege${club.id}">
                    <h2 class="mb-0">
                        <button class="btn btn-link" type="button" data-bs-toggle="collapse" data-bs-target="#collapseCollege${club.id}" aria-expanded="false" aria-controls="collapseCollege${club.id}" id="btnCollege${club.id}">
                            <span class="plus-sign"></span> ${club.name} (${club.number}) - ${club.city}, ${club.state}
                        </button>
                    </h2>
                </div>
                <div id="collapseCollege${club.id}" class="collapse" aria-labelledby="headingCollege${club.id}" data-bs-parent="#college-club-list">
                    <div class="card-body">
                        <ul>
                            <li><strong>Name:</strong> ${club.name}</li>
                            <li><strong>Club Number:</strong> ${club.number}</li>
                            ${teamNumberLine}
                            <li><strong>Type:</strong> ${club.club_type}</li>
                            <li><strong>City:</strong> ${club.city}</li>
                            <li><strong>State:</strong> ${club.state}</li>
                            <li><strong>Website:</strong> <a href="${club.website}" target="_blank">${club.website}</a></li>
                            <li><strong>President:</strong> ${club.president}</li>
                            <li><strong>Faculty Advisor:</strong> ${club.faculty_advisor}</li>
                            <li><strong>Mentor:</strong> ${club.mentor}</li>
                            <li><strong>Flyer of Record:</strong> ${club.flyer_of_record}</li>
                            ${associatedLaunchClubsLine}
                            <li><strong>Contact Email:</strong> <a href="mailto:${club.contact_email}">${club.contact_email}</a></li>
                            ${upcomingEventsLine}
                        </ul>
                    </div>
                </div>
            </div>`;
            
            $('#college-club-list').append(clubItem);
        });
        
        // Plus/minus sign toggling
        $('.collapse').on('show.bs.collapse', function () {
            $(this).prev('.card-header').find('.plus-sign').removeClass('plus-sign').addClass('minus-sign');
        }).on('hide.bs.collapse', function () {
            $(this).prev('.card-header').find('.minus-sign').removeClass('minus-sign').addClass('plus-sign');
        });
    }).fail(function (jqxhr, textStatus, error) {
        console.error("Failed to load college clubs:", textStatus, error);
    });
});
