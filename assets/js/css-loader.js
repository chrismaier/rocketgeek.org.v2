
/*
    Dynamically load CSS files from a json file
    Make maintaining the CSS styles =MUCH= more maintainable
    by keeping the list of files that need to be included in a single location
    
    ** you can always add a single line to include one CSS file if the page requires a one-off CSS **
 */

document.addEventListener('DOMContentLoaded', function()
{
    fetch('/assets/json-data/css-head-config.json')
        .then(response => response.json())
        .then(data => {
            const head = document.head;
            
            // Link tags
            data.links.forEach(linkData => {
                const link = document.createElement('link');
                Object.keys(linkData).forEach(key => {
                    link.setAttribute(key, linkData[key]);
                });
                head.appendChild(link);
            });
        })
        .catch(error => {
            console.error('Error loading the CSS configuration:', error);
        });
    
    // Make the body of the page visible after all the css files have been loaded
    document.body.style.display = "block";
});
