document.addEventListener('DOMContentLoaded', function() {
    fetch('./assets/json-data/pad-box-inventory.json')
        .then(response => response.json())
        .then(data => {
            const padBoxes = data.padBoxes;
            const container = document.getElementById('padsContainer');
            
            padBoxes.forEach(pad => {
                const padBox = document.createElement('div');
                padBox.className = 'pad-box';
                
                let itemsList = '';
                for (const [key, value] of Object.entries(pad.items)) {
                    itemsList += `
                        <li class="list-group-item">
                            <strong>${key}:</strong> ${value.present ? 'Yes' : 'No'} (${value.quantity}), ${value.condition}
                        </li>
                    `;
                }
                
                padBox.innerHTML = `
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">${pad.name}</h5>
                            <ul class="list-group list-group-flush">
                                ${itemsList}
                            </ul>
                        </div>
                    </div>
                `;
                
                container.appendChild(padBox);
            });
        })
        .catch(error => console.error('Error fetching the pad boxes data:', error));
});
