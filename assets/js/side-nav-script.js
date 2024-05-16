document.addEventListener("DOMContentLoaded", function() {
    fetch('./assets/json-data/side-nav-data.json')
        .then(response => response.json())
        .then(data => {
            const navContainer = document.getElementById('accordionSidebar');
            data.forEach(item => {
                const li = document.createElement('li');
                li.className = 'nav-item';
                const a = document.createElement('a');
                a.className = 'nav-link';
                if (item.active) {
                    a.classList.add('active');
                }
                a.href = item.href;
                const icon = document.createElement('i');
                icon.className = item.icon;
                const span = document.createElement('span');
                span.textContent = item.text;
                a.appendChild(icon);
                a.appendChild(span);
                li.appendChild(a);
                navContainer.appendChild(li);
            });
        })
        .catch(error => console.error('Error loading navigation data:', error));
});
