// menu.js
document.addEventListener("DOMContentLoaded", function() {
    // Define function to fetch and populate dropdown menu
    function populateDropdownMenu(menuId, triggerId, jsonFile) {
        console.log("Menu ID: " + menuId);
        console.log("Trigger ID: " + triggerId);
        console.log("JSON file name: " + jsonFile);
        // Fetch JSON data
        fetch(jsonFile)
            .then(response => response.json())
            .then(data => {
                // Get dropdown menu element
                let dropdownMenu = document.getElementById(menuId);
                let triggerElement = document.getElementById(triggerId);
                console.log("Jsonfile data" + jsonFile)
                
                // Populate dropdown menu
                data.forEach(item => {
                    console.log("Json url data: " + item.url);
                    console.log("Json label data: " + item.label);
                    let menuItem = document.createElement("a");
                    menuItem.classList.add("dropdown-item");
                    menuItem.href = item.url;
                    menuItem.textContent = item.label;
                    dropdownMenu.appendChild(menuItem);
                });
                
                // Remove the ID from the trigger element to avoid duplication
                triggerElement.removeAttribute("id");
            })
            .catch(error => console.error('Error fetching data:', error));
    }
    
    // Call function to populate each dropdown menu
    populateDropdownMenu("menu1", "menu1Trigger", "/assets/json-data/menu1.json");
    populateDropdownMenu("alert-menu", "alertTrigger", "/assets/json-data/alerts-menu.json");
    // Add more dropdown menus as needed
});
