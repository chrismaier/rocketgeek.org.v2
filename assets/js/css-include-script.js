fetch('/assets/json-data/css-include-list.json')
    .then(response => response.json())
    .then(data => {
        // Function to add CSS files dynamically to the head section
        function addCSSFiles(cssIncludeFiles) {
            cssIncludeFiles.forEach(function(cssFile) {
                let link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = cssFile;
                document.head.appendChild(link);
            });
        }
        
        // List of CSS files from JSON
        let cssIncludeFiles = data.cssIncludeFiles;
        
        // Add CSS files dynamically
        addCSSFiles(cssIncludeFiles);
    })
    .catch(error => console.error('Error fetching styles.json:', error));
