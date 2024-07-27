document.addEventListener("DOMContentLoaded", function() {
    fetch('/assets/json-data/side-nav-data-active-example.json')
        .then(response => response.json())
        .then(data => {
            const navContainer = document.getElementById('accordionSidebar');
            const fragment = document.createDocumentFragment();
            
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
                fragment.appendChild(li);
                
                // Add click event listener to each link
                a.addEventListener('click', function(event) {
                    // Prevent default action if necessary (e.g., for single-page applications)
                    // event.preventDefault();
                    
                    // Remove 'active' class from all links
                    document.querySelectorAll('#accordionSidebar .nav-link').forEach(link => {
                        link.classList.remove('active');
                    });
                    
                    // Add 'active' class to the clicked link
                    a.classList.add('active');
                });
            });
            
            navContainer.appendChild(fragment);
        })
        .catch(error => {
            console.error('Error loading navigation data:', error);
            const errorMessage = document.createElement('div');
            errorMessage.className = 'alert alert-danger';
            errorMessage.textContent = 'Failed to load navigation data.';
            document.getElementById('accordionSidebar').appendChild(errorMessage);
        });
});
