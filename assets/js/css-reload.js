/*
    This file should be the VERY LAST js file at the bottom of the page
    The purpose of the script / function is to get the css objects to re-apply
    Therefore it needs to run as late in the load process as possible
 */
document.addEventListener("DOMContentLoaded", function() {
    // Apply your CSS dynamically here
    // For example, you can add or remove classes to trigger changes
    
    // Example:
    document.body.classList.add('loaded');
});
