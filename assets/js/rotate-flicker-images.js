document.addEventListener("DOMContentLoaded", function () {
    const jsonFilePath = "/assets/json-data/flickr-rotating-photos.json"; // Adjust path to your JSON file
    const imageElement = document.querySelector("#flickr-photo");
    const titleElement = document.querySelector("#photo-title");
    const clubElement = document.querySelector("#photo-club");
    const dateElement = document.querySelector("#photo-date");
    
    let index = 0;
    
    fetch(jsonFilePath)
        .then((response) => {
            if (!response.ok) {
                throw new Error("Failed to fetch JSON data.");
            }
            return response.json();
        })
        .then((data) => {
            if (data.images && Array.isArray(data.images) && data.images.length > 0) {
                function rotateImage() {
                    const { title, club, date, fullsize } = data.images[index];
                    imageElement.src = fullsize;
                    imageElement.alt = title;
                    titleElement.textContent = title;
                    clubElement.textContent = `Club: ${club}`;
                    dateElement.textContent = `Date: ${date}`;
                    index = (index + 1) % data.images.length;
                }
                
                // Initial load
                rotateImage();
                
                // Rotate every 5 seconds (adjust as needed)
                setInterval(rotateImage, 5000);
            } else {
                console.error("JSON data does not contain a valid images array.");
            }
        })
        .catch((error) => {
            console.error("Error loading Flickr images:", error);
        });
});
