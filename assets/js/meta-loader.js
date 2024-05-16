/*

    Dynamically load meta tags in the head section of our html files
    The page TITLE meta tage is excluded as it will be different for each page.
    All other meta tags that are shared across the site should be loaded here
      ("here" being the json config file that this script dynamically loads )
 */

document.addEventListener('DOMContentLoaded', function() {
    fetch('./assets/json-data/meta-head-config.json')
        .then(response => response.json())
        .then(data => {
            const head = document.head;
            
            // Charset
            const metaCharset = document.createElement('meta');
            metaCharset.setAttribute('charset', data.charset);
            head.appendChild(metaCharset);
            
            // Viewport
            const metaViewport = document.createElement('meta');
            metaViewport.name = 'viewport';
            metaViewport.content = data.viewport;
            head.appendChild(metaViewport);
            
            // Meta tags
            data.meta.forEach(metaData => {
                const meta = document.createElement('meta');
                Object.keys(metaData).forEach(key => {
                    meta.setAttribute(key, metaData[key]);
                });
                head.appendChild(meta);
            });
        })
        .catch(error => {
            console.error('Error loading the meta configuration:', error);
        });
});
