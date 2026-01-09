// network-device-loader.js

document.addEventListener('DOMContentLoaded', () => {
    fetch('/assets/json-data/network-devices.json')
        .then(response => response.json())
        .then(devices => {
            const deviceList = document.getElementById('device-list');
            devices.forEach(device => {
                const deviceCard = document.createElement('div');
                deviceCard.className = 'col-md-4 device-card';
                
                deviceCard.innerHTML = `
                    <h5>${device.deviceDescription}</h5>
                    <p><strong>Type:</strong> ${device.deviceType}</p>
                    <p><strong>Host Name:</strong> ${device.hostName}</p>
                    <p><strong>IP Address:</strong> ${device.ipAddress}</p>
                    <p><strong>MAC Address:</strong> ${device.macAddress}</p>
                    <p><strong>Setup Location:</strong> ${device.setupLocation}</p>
                    <p><strong>Storage Location:</strong> ${device.storageLocation}</p>
                    <p><strong>Owned By:</strong> ${device.ownedBy}</p>
                `;
                
                deviceList.appendChild(deviceCard);
            });
        })
        .catch(error => console.error('Error fetching device data:', error));
});
