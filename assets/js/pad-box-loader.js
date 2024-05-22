document.addEventListener('DOMContentLoaded', function() {
    fetch('pad-boxes.json')
        .then(response => response.json())
        .then(data => {
            const padBoxes = data.padBoxes;
            const container = document.getElementById('padsContainer');
            
            let row;
            padBoxes.forEach((pad, index) => {
                if (index % 2 === 0) {
                    row = document.createElement('div');
                    row.className = 'row';
                    container.appendChild(row);
                }
                
                const col = document.createElement('div');
                col.className = 'col-md-6';
                
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
                            <p class="card-text">${pad.description}</p>
                            <ul class="list-group list-group-flush">
                                ${itemsList}
                            </ul>
                        </div>
                    </div>
                `;
                
                col.appendChild(padBox);
                row.appendChild(col);
            });
        })
        .catch(error => console.error('Error fetching the pad boxes data:', error));
});
