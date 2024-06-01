document.addEventListener("DOMContentLoaded", function() {
    fetch('assets/json-data/calendar-events.json')
        .then(response => response.json())
        .then(data => {
            populateCalendar(data);
        })
        .catch(error => {
            console.error('Error loading events:', error);
            populateCalendar([]);
        });
});

function populateCalendar(events) {
    const daysElement = document.querySelector('.days');
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const todayDate = new Date().getDate();
    
    // Calculate the first day of the current month
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const startDay = firstDayOfMonth.getDay(); // Index of the first day of the month (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate(); // Number of days in the current month
    
    // Calculate the previous month
    const prevMonth = new Date(currentYear, currentMonth, 0);
    const daysInPrevMonth = prevMonth.getDate(); // Number of days in the previous month
    const startDayPrevMonth = (startDay - 1 < 0) ? 6 : startDay - 1; // Index of the first day of the previous month
    
    let daysHTML = '';
    
    // Display the previous month's days
    for (let i = startDayPrevMonth; i >= 0; i--) {
        daysHTML += `<li class="calendar-text-light">${daysInPrevMonth - i}</li>`;
    }
    
    // Display the current month's days
    for (let day = 1; day <= daysInMonth; day++) {
        let dayEvents = events.filter(event => new Date(event.start_date).getDate() <= day && new Date(event.end_date).getDate() >= day && new Date(event.start_date).getMonth() === currentMonth);
        let eventDetails = '';
        
        if (dayEvents.length > 0) {
            let colorClass = dayEvents[0].color || 'bg-success'; // Default to green if color is not provided
            
            if (dayEvents.length === 1 && new Date(dayEvents[0].start_date).getDate() === day && new Date(dayEvents[0].end_date).getDate() === day) {
                // Single-day event
                eventDetails = `<div class="event ${colorClass}" data-toggle="modal" data-target="#eventModal" data-name="${dayEvents[0].name}" data-start-date="${dayEvents[0].start_date}" data-end-date="${dayEvents[0].end_date}" data-start-time="${dayEvents[0].start_time}" data-end-time="${dayEvents[0].end_time}" data-location-name="${dayEvents[0].location_name}" data-contact-name="${dayEvents[0].contact_name}" data-location-address="${dayEvents[0].location_address}">${dayEvents[0].name}</div>`;
            } else {
                // Multi-day event
                const isFirstDay = new Date(dayEvents[0].start_date).getDate() === day;
                const isLastDay = new Date(dayEvents[0].end_date).getDate() === day;
                const barClasses = `event-bar ${isFirstDay ? 'event-bar-start' : ''} ${isLastDay ? 'event-bar-end' : ''}`;
                eventDetails = `<div class="${barClasses} ${colorClass}" data-toggle="modal" data-target="#eventModal" data-name="${dayEvents[0].name}" data-start-date="${dayEvents[0].start_date}" data-end-date="${dayEvents[0].end_date}" data-start-time="${dayEvents[0].start_time}" data-end-time="${dayEvents[0].end_time}" data-location-name="${dayEvents[0].location_name}" data-contact-name="${dayEvents[0].contact_name}" data-location-address="${dayEvents[0].location_address}">${dayEvents[0].name}</div>`;
            }
        }
        
        if (currentMonth === new Date().getMonth()) {
            if (day === todayDate) {
                daysHTML += `<li class="calendar-text-bold calendar-text-red">${day}${eventDetails}</li>`; // Bold and Rocket Geek red for current month's date
            } else {
                daysHTML += `<li class="calendar-text-bold calendar-text-black">${day}${eventDetails}</li>`; // Bold and black for current month's date
            }
        } else {
            daysHTML += `<li class="calendar-text-light">${day}${eventDetails}</li>`; // Lighter color for other days
        }
    }
    
    // Calculate the total number of days to display
    const totalDays = Math.ceil((daysInMonth + startDay) / 7) * 7;
    
    // Display the next month's days if needed to complete the last week
    for (let i = 1; i <= totalDays - (daysInMonth + startDay); i++) {
        daysHTML += `<li class="calendar-text-light">${i}</li>`;
    }
    
    daysElement.innerHTML = daysHTML;
}

// Event listener for displaying event details in modal
document.addEventListener('click', function(event) {
    if (event.target && event.target.classList.contains('event')) {
        const eventName = event.target.dataset.name;
        const eventStartDate = event.target.dataset.start_date;
        const eventEndDate = event.target.dataset.end_date;
        const eventStartTime = event.target.dataset.start_time;
        const eventEndTime = event.target.dataset.end_time;
        const eventLocationName = event.target.dataset.location_name;
        const eventContactName = event.target.dataset.contact_name;
        const eventLocationAddress = event.target.dataset.location_address;
        
        document.getElementById('eventName').textContent = eventName;
        document.getElementById('eventStartDate').textContent = eventStartDate;
        document.getElementById('eventEndDate').textContent = eventEndDate;
        document.getElementById('eventStartTime').textContent = eventStartTime;
        document.getElementById('eventEndTime').textContent = eventEndTime;
        document.getElementById('eventLocationName').textContent = eventLocationName;
        document.getElementById('eventContactName').textContent = eventContactName;
        document.getElementById('eventLocationAddress').textContent = eventLocationAddress;
        
        $('#eventModal').modal('show');
    }
});
