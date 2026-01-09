// side-nav-aarow-button.js

// JavaScript for toggling sidebar
document.getElementById('sidebarToggle').addEventListener('click', function ()
{
    document.getElementById('sidebar').classList.toggle('active');
    // Toggle the arrow icon
    document.getElementById('icon-toggle').classList.toggle('fa-arrows-left-right-to-line');
    //document.getElementById('icon-toggle').classList.toggle('fa-arrow-right');
});

//<i class="fa-solid fa-arrows-left-right-to-line"></i>
