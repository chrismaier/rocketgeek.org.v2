$(document).ready(function () {
    console.log("Chemical list document is ready");
    
    $.getJSON("/assets/json-data/master-chemical-list.json", function (data) {
        console.log("Chemical JSON data loaded", data);
        
        data.forEach(function (chemical, index) {
            console.log("Processing chemical:", chemical.reference_id);
            
            let chemicalItem = `
            <div class="card">
                <div class="card-header" id="heading${index}">
                    <h2 class="mb-0">
                        <button class="btn btn-link" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${index}" aria-expanded="false" aria-controls="collapse${index}" id="btn${index}">
                            <span class="plus-sign"></span> ${chemical.short_description}
                        </button>
                    </h2>
                </div>
                <div id="collapse${index}" class="collapse" aria-labelledby="heading${index}" data-parent="#chemical-list">
                    <div class="card-body">
                        <ul>
                            <li><strong>Reference:</strong> ${chemical.reference_id}</li>
                            <li><strong>Common Name:</strong> ${chemical.name}</li>
                            <li><strong>Description:</strong> ${chemical.short_description}</li>
                            <li><strong>More Details:</strong> <a href="${chemical.url}" target="_blank">${chemical.link_label}</a></li>
                        </ul>
                    </div>
                </div>
            </div>
            `;
            
            $('#chemical-list').append(chemicalItem);
        });
        
        console.log("All chemicals processed and added to the DOM");
        
        $('[id^=btn]').click(function () {
            console.log(`Button ${this.id} clicked`);
        });
        
        $('.collapse').on('show.bs.collapse', function () {
            $(this).prev('.card-header').find('.plus-sign').removeClass('plus-sign').addClass('minus-sign');
        }).on('hide.bs.collapse', function () {
            $(this).prev('.card-header').find('.minus-sign').removeClass('minus-sign').addClass('plus-sign');
        });
        
    }).fail(function (jqxhr, textStatus, error) {
        console.error("Error loading chemical JSON data", textStatus, error);
    });
});
