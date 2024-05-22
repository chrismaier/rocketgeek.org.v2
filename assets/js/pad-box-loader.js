document.addEventListener("DOMContentLoaded", function () {
    const row = document.querySelector('.row');
    
    fetch('./assets/json-data/pad-box-inventory.json')
        .then(response => response.json())
        .then(data => {
            console.log(data); // Add this line to check if data is retrieved successfully
            
            data.padBoxes.forEach(pad => {
                const col = document.createElement('div');
                col.classList.add('col-md-6');
                console.log(pad);  //Looking to see if the script finds any pad objects
                
                const padBox = document.createElement('div');
                padBox.classList.add('pad-box');
                console.log(padBox);
                
                let itemsList = '';
                console.log(itemsList);
                
                for (const [itemName, item] of Object.entries(pad.items)) {
                    itemsList += `
                        <li class="item-description">${item.description}</li>
                        <ul class="item-details">
                            <li>Present: ${item.present ? 'Yes' : 'No'}</li>
                            <li>Quantity: ${item.quantity}</li>
                            <li>Condition: ${item.condition}</li>
                        </ul>
                    `;
                    console.log(itemsList);
                }
                
                padBox.innerHTML = `
                    <h3>${pad.name}</h3>
                    <p class="pad-description">${pad.description}</p>
                    <ul class="list-group">
                        ${itemsList}
                    </ul>
                `;
                
                col.appendChild(padBox);
                if(row) {
                    row.appendChild(col); // Ensure row exists before appending
                    console.log("appending a row", row);
                }
            });
        })
        .catch(error => console.error('Error fetching pad boxes:', error));
});
