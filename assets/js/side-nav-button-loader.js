// side-nav-button-loader.js

/*
    Try and fix the odd side nav arrow button by loading it later in the page load process
    window.onload didn't load the button...
    
    Completely useless - button does not work, AND the odd icon behavior persists
 */

/*
window.onload = function() {
    addButton();
};

*/

document.addEventListener('DOMContentLoaded', function() {
    addButton();
});

function addButton() {
    let button = document.createElement('button');
    button.className = 'btn rounded-circle border-0';
    button.id = 'sidebarToggle';
    button.type = 'button';
    
    let container = document.getElementById('nav-slider-button');
    container.appendChild(button);
}




