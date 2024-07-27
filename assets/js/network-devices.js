// Assuming you're using jQuery for simplicity, make sure to include jQuery library in your HTML file
$(document).ready(function() {
    // Fetch data from JSON file
    $.getJSON("/assets/json-data/network-devices.json", function(data) {
        // Iterate through each device in the JSON data
        $.each(data, function(index, device) {
            // Create a new row for the device
            let row = $("<tr>");
            
            // Append each device attribute as a table data cell with black text
            row.append($("<td>").addClass("black-text").text(device.deviceDescription));
            row.append($("<td>").addClass("black-text").text(device.deviceType));
            row.append($("<td>").addClass("black-text").text(device.hostName));
            row.append($("<td>").addClass("black-text").text(device.ipAddress));
            row.append($("<td>").addClass("black-text").text(device.macAddress));
            row.append($("<td>").addClass("black-text").text(device.setupLocation));
            row.append($("<td>").addClass("black-text").text(device.storageLocation));
            row.append($("<td>").addClass("black-text").text(device.ownedBy));
            
            // Append the new row to the device list table
            $("#device-list").append(row);
        });
    });
});
