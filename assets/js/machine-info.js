// script.js
async function loadConfiguration() {
    try {
        const response = await fetch('/assets/json-data/tsconfig.json');
        if (!response.ok) {
            throw new Error('Failed to fetch configuration');
        }
        const config = await response.json();
        
        // Access machines array from the configuration
        const machines = config.machines;
        
        // Get reference to the machines container element
        const machinesContainer = document.getElementById('machines');
        
        // Loop through each machine and create HTML elements to display the data
        machines.forEach(machine => {
            const machineDiv = document.createElement('div');
            machineDiv.innerHTML = `
                <h2>${machine.name}</h2>
                <p>FQDN: ${machine.fqdn}</p>
                <p>IP Address: ${machine.ip}</p>
                <p>MAC Address: ${machine.mac}</p>
            `;
            machinesContainer.appendChild(machineDiv);
        });
    } catch (error) {
        console.error('Error loading configuration:', error);
        
    }
}
