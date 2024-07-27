document.addEventListener('DOMContentLoaded', function () {
    fetch('/assets/json-data/other-links.json')
        .then(response => response.json())
        .then(data => {
            const linkContainer = document.querySelector('#link-container');
            data.forEach(link => {
                const card = document.createElement('div');
                card.className = 'link-card';
                
                card.onclick = () => {
                    window.open(link.url, '_blank');
                };
                
                const title = document.createElement('h3');
                title.className = 'link-title';
                title.textContent = link.title;
                
                const url = document.createElement('p');
                url.className = 'link-url';
                url.textContent = link.url;
                
                const description = document.createElement('p');
                description.className = 'link-description';
                description.textContent = link.description;
                
                card.appendChild(title);
                card.appendChild(url);
                card.appendChild(description);
                linkContainer.appendChild(card);
            });
        })
        .catch(error => console.error('Error fetching the links:', error));
});
