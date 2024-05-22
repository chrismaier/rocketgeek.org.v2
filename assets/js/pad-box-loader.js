// Fetch the JSON data from the server
fetch('./assets/json-data/pad-box-inventory.json')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        // Process the JSON data here
        const padsContainer = document.getElementById('padsContainer');
        
        // Iterate over each pad box
        data.padBoxes.forEach(padBox => {
            // Create a div for each pad box container
            const padBoxContainer = document.createElement('div');
            padBoxContainer.classList.add('pad-box-container');
            
            // Create a div for each pad box
            const padBoxDiv = document.createElement('div');
            padBoxDiv.classList.add('pad-box');
            
            // Create a header for pad box name
            const padBoxHeader = document.createElement('h2');
            padBoxHeader.classList.add('pad-box-header');
            padBoxHeader.textContent = padBox.name;
            padBoxDiv.appendChild(padBoxHeader);
            
            // Create a paragraph for pad box description
            const padBoxDescription = document.createElement('p');
            padBoxDescription.classList.add('pad-box-description');
            padBoxDescription.textContent = padBox.description;
            padBoxDiv.appendChild(padBoxDescription);
            
            // Iterate over each item in the pad box
            Object.entries(padBox.items).forEach(([itemName, item]) => {
                // Create list item for each item
                const listItem = document.createElement('div');
                listItem.classList.add('item');
                
                // Create item description
                const itemDescription = document.createElement('span');
                itemDescription.classList.add('item-description');
                itemDescription.textContent = item.description;
                
                // Create item quantity
                const itemQuantity = document.createElement('span');
                itemQuantity.textContent = `(${item.quantity})`;
                
                // Check if present is false and add present-false class
                if (!item.present) {
                    listItem.classList.add('present-false');
                }
                
                // Append description and quantity to list item
                listItem.appendChild(itemDescription);
                listItem.appendChild(document.createTextNode('\u00A0\u00A0')); // Add spaces
                listItem.appendChild(itemQuantity);
                
                // Append list item to pad box div
                padBoxDiv.appendChild(listItem);
            });
            
            // Append pad box div to pad box container
            padBoxContainer.appendChild(padBoxDiv);
            
            // Append pad box container to pads container
            padsContainer.appendChild(padBoxContainer);
        });
    })
    .catch(error => {
        console.error('Error fetching pad boxes:', error);
    });
