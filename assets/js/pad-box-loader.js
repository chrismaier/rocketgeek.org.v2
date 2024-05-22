// Select the container where pad inventory will be rendered
const padsContainer = document.getElementById('padsContainer');

// Fetch the JSON data
fetch('./assets/json-data/pad-box-inventory.json')
    .then(response => response.json())
    .then(data => {
        // Iterate over each pad box
        data.padBoxes.forEach(padBox => {
            // Create a div for each pad box
            const padBoxDiv = document.createElement('div');
            padBoxDiv.classList.add('pad-box');
            
            // Create a heading for pad box name and description
            const padHeading = document.createElement('h4');
            padHeading.classList.add('pad-heading');
            padHeading.innerHTML = `${padBox.name}<br><span class="pad-description">${padBox.description}</span>`;
            padBoxDiv.appendChild(padHeading);
            
            // Create an unordered list for items
            const itemList = document.createElement('ul');
            itemList.classList.add('item-list');
            
            // Iterate over each item in the pad box
            Object.entries(padBox.items).forEach(([itemName, item]) => {
                // Create list item for each item
                const listItem = document.createElement('li');
                listItem.classList.add('item');
                
                // Create item description
                const itemDescription = document.createElement('span');
                itemDescription.classList.add('item-description');
                itemDescription.innerHTML = `<em>${item.description}</em>:`;
                
                // Create item details
                const itemDetails = document.createElement('span');
                itemDetails.classList.add('item-details');
                itemDetails.innerHTML = `Present: ${item.present ? 'Yes' : 'No'}, Quantity: ${item.quantity}, Condition: ${item.condition}`;
                
                // Append description and details to list item
                listItem.appendChild(itemDescription);
                listItem.appendChild(itemDetails);
                
                // Append list item to item list
                itemList.appendChild(listItem);
            });
            
            // Append item list to pad box div
            padBoxDiv.appendChild(itemList);
            
            // Append pad box div to pads container
            padsContainer.appendChild(padBoxDiv);
        });
    })
    .catch(error => console.error('Error fetching pad boxes:', error));
