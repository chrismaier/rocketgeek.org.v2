$(document).ready(function() {
    $.getJSON("./assets/json-data/club-info.json", function(data) {
        data.forEach(function(club) {
            let clubItem = `
            <div class="card">
          <div class="card-header" id="heading${club.id}">
            <h2 class="mb-0">
              <button class="btn btn-link" type="button" data-toggle="collapse" data-target="#collapse${club.id}" aria-expanded="true" aria-controls="collapse${club.id}">
                <span class="plus-sign">+</span> bgklfujlllevigili${club.name} (${club.number}) - ${club.city}
              </button>
            </h2>
          </div>

          <div id="collapse${club.id}" class="collapse" aria-labelledby="heading${club.id}" data-parent="#club-list">
            <div class="card-body">
              <ul>
                <li><strong>Name:</strong> ${club.name}</li>
                <li><strong>Club Number:</strong> ${club.number}</li>
                <li><strong>City:</strong> ${club.city}</li>
                <li><strong>Website:</strong> <a href="${club.website}" target="_blank">${club.website}</a></li>
                <!-- Add other details as needed -->
              </ul>
            </div>
          </div>
        </div>
      `;
            $('#club-list').append(clubItem);
        });
    });
});
