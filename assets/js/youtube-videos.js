document.addEventListener("DOMContentLoaded", () => {
    fetch('/assets/json-data/youtube-videos.json')
        .then(response => response.json())
        .then(data => {
            const videoGallery = document.getElementById('videoGallery');
            data.videos.forEach(video => {
                const videoCard = document.createElement('div');
                videoCard.classList.add('video-card');
                
                const videoTitle = document.createElement('div');
                videoTitle.classList.add('video-title');
                videoTitle.textContent = video.title;
                
                const videoIframe = document.createElement('iframe');
                videoIframe.src = video.url;
                videoIframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
                videoIframe.allowFullscreen = true;
                
                const videoDescription = document.createElement('div');
                videoDescription.classList.add('video-description');
                videoDescription.textContent = video.description;
                
                videoCard.appendChild(videoTitle);
                videoCard.appendChild(videoIframe);
                videoCard.appendChild(videoDescription);
                
                videoGallery.appendChild(videoCard);
            });
        })
        .catch(error => console.error('Error fetching the video data:', error));
});
