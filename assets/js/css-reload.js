// css-reload.js

/*
    This file should be the VERY LAST js file at the bottom of the page
    The purpose of the script / function is to get the css objects to re-apply
    Therefore it needs to run as late in the load process as possible
*/

document.addEventListener('rg-css-ready', function()
{
    document.body.classList.add('loaded');
});
