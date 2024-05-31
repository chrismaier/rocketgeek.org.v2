// menu.js
document.addEventListener("DOMContentLoaded", function() {
    // Define function to fetch and populate dropdown menu
    function populateDropdownMenu(menuId, jsonFile) {
        // Fetch JSON data
        fetch(jsonFile)
            .then(response => response.json())
            .then(data => {
                // Get dropdown menu element
                let dropdownMenu = document.getElementById(menuId);
                
                // Populate dropdown menu
                data.forEach(item => {
                    let menuItem = document.createElement("a");
                    menuItem.classList.add("dropdown-item");
                    menuItem.href = item.url;
                    menuItem.textContent = item.label;
                    dropdownMenu.appendChild(menuItem);
                });
            })
            .catch(error => console.error('Error fetching data:', error));
    }
    
    // Call function to populate each dropdown menu
    // Rename the json file and the id attribute in the menu section in the web page
    populateDropdownMenu("menu1", "menu1.json");
    populateDropdownMenu("menu2", "menu2.json");
    // Add more dropdown menus as needed
});
