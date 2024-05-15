$(document).ready(function() {
    // Fetch images from a JSON file
    $.getJSON('images.json', function(data) {
        let imageGallery = $('#image-gallery');
        
        data.images.forEach(function(image) {
            // Create a column for each image
            let col = $('<div class="col-md-4 mb-4"></div>');
            
            // Create a card for each image
            let card = $(`
                <div class="card">
                    <img src="${image.fullsize}" class="card-img-top" alt="${image.title}" data-fullsize="${image.fullsize}">
                    <div class="card-body">
                        <h5 class="card-title">${image.title}</h5>
                        <p class="card-text"><strong>Club:</strong> ${image.club}</p>
                        <p class="card-text"><strong>Date:</strong> ${image.date}</p>
                        <p class="card-text"><strong>Flyer:</strong> ${image.flyer}</p>
                    </div>
                </div>
            `);
            
            // Append the card to the column
            col.append(card);
            
            // Append the column to the image gallery
            imageGallery.append(col);
        });
        
        // Add click event to show full-size image in a modal
        $('.card-img-top').on('click', function() {
            let fullsizeImageUrl = $(this).data('fullsize');
            $('#full-size-image').attr('src', fullsizeImageUrl);
            $('#imageModal').modal('show');
        });
    });
});
