// Function to generate the calendar
function generateCalendar() {
    const calendarElement = document.getElementById('calendar');
    const monthYearElement = document.getElementById('currentMonthYear');
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Clear existing calendar
    calendarElement.innerHTML = '';

    // Get the first day of the month
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const startingDay = firstDayOfMonth.getDay();

    // Get the number of days in the month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Display current month and year
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
    monthYearElement.textContent = monthNames[currentMonth] + ' ' + currentYear;

    // Generate calendar header with day labels
    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const calendarHeader = document.createElement('div');
    calendarHeader.classList.add('calendar-header');
    dayNames.forEach(day => {
        const dayElement = document.createElement('div');
        dayElement.classList.add('day');
        dayElement.textContent = day;
        calendarHeader.appendChild(dayElement);
    });
    calendarElement.appendChild(calendarHeader);

    // Generate calendar grid
    for (let i = 0; i < startingDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.classList.add('day');
        emptyDay.classList.add('other-month');
        calendarElement.appendChild(emptyDay);
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('day');
        if (i === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
            dayElement.classList.add('today');
        }
        dayElement.textContent = String(i); // Convert i to string before assigning
        calendarElement.appendChild(dayElement);
    }
}

// Call the function to generate the calendar
generateCalendar();
