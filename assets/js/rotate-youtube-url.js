document.addEventListener("DOMContentLoaded", function () {
    const jsonFilePath = "/assets/json-data/rotate-youtube-url.json"; // Adjust path as needed
    const iframe = document.querySelector("iframe");
    
    let index = 0;
    
    fetch(jsonFilePath)
        .then((response) => {
            if (!response.ok) {
                throw new Error("Failed to fetch JSON data.");
            }
            return response.json();
        })
        .then((data) => {
            if (Array.isArray(data) && data.length > 0) {
                function rotateURL() {
                    const { url } = data[index];
                    iframe.src = url;
                    index = (index + 1) % data.length;
                }
                
                // Initial load
                rotateURL();
                
                // Rotate every 10 seconds (adjust as needed)
                setInterval(rotateURL, 10000);
            } else {
                console.error("JSON data is not in the expected format or is empty.");
            }
        })
        .catch((error) => {
            console.error("Error loading YouTube URLs:", error);
        });
});
