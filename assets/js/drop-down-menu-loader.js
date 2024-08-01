document.addEventListener("DOMContentLoaded", function() {
    // Define function to fetch and populate dropdown menu
    function populateDropdownMenu(menuId, triggerId, jsonFile, headerText) {
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
                console.log("Jsonfile data: " + jsonFile);
                
                // Add header to dropdown menu
                let header = document.createElement("h6");
                header.classList.add("dropdown-header");
                header.textContent = headerText;
                dropdownMenu.appendChild(header);
                
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
    populateDropdownMenu("questionAndAnswer", "questionAndAnswerTrigger", "/assets/json-data/question-and-answer.json", "Questions & Answers");
    populateDropdownMenu("rocketPerformance", "rocketPerformanceTrigger", "/assets/json-data/rocket-performance.json", "Rocket Performance Analysis");
    populateDropdownMenu("motorTesting", "motorTestingTrigger", "/assets/json-data/motor-testing.json", "Rocket Motor Testing");
    populateDropdownMenu("motorFormulas", "motorFormulaTrigger", "/assets/json-data/motor-formulas.json", "Rocket Motor Formulas");
    populateDropdownMenu("mixingMotors", "mixingMotorsTrigger", "/assets/json-data/mixing-motors.json", "Rocket Motor Mixing");
    populateDropdownMenu("vendorList", "vendorListTrigger", "/assets/json-data/vendor-list.json", "Vendor List");
    populateDropdownMenu("linksCenter", "linksCenterTrigger", "/assets/json-data/links-center.json", "Links Center");
    populateDropdownMenu("alertsCenter", "alertsCenterTrigger", "/assets/json-data/alerts-center.json", "Alerts Center");
    populateDropdownMenu("messageCenter", "messageCenterTrigger", "/assets/json-data/message-center.json", "Message Center");
});
