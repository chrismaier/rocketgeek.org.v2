// Get today's date
let today = new Date();
let currentMonth = today.getMonth();
let currentYear = today.getFullYear();
let months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Display the calendar
showCalendar(currentMonth, currentYear);

function showCalendar(month, year) {
    let firstDay = new Date(year, month).getDay();
    let daysInMonth = 32 - new Date(year, month, 32).getDate();

    let tbl = document.getElementById("calendar-body");

    // Clear previous cells
    tbl.innerHTML = "";

    // Fill the calendar
    let date = 1;
    for (let i = 0; i < 6; i++) {
        let row = document.createElement("tr");

        for (let j = 0; j < 7; j++) {
            if (i === 0 && j < firstDay) {
                let cell = document.createElement("td");
                let cellText = document.createTextNode("");
                cell.appendChild(cellText);
                row.appendChild(cell);
            } else if (date > daysInMonth) {
                break;
            } else {
                let cell = document.createElement("td");
                cell.classList.add("day");
                let cellText = document.createTextNode(date.toString());
                if (date === today.getDate() && year === today.getFullYear() && month === today.getMonth()) {
                    //cell.classList.add("bg-info");
                    cell.classList.replace("day", "bg-info");


                } // color today's date
                cell.appendChild(cellText);
                row.appendChild(cell);
                date++;
            }
        }
        tbl.appendChild(row);
    }

    // Display month and year
    document.getElementById("monthAndYear").innerHTML = months[month] + " " + year;
}

/*
// Previous month
function prev() {
    currentYear = (currentMonth === 0) ? currentYear - 1 : currentYear;
    currentMonth = (currentMonth === 0) ? 11 : currentMonth - 1;
    showCalendar(currentMonth, currentYear);
}

// Next month
function next() {
    currentYear = (currentMonth === 11) ? currentYear + 1 : currentYear;
    currentMonth = (currentMonth + 1) % 12;
    showCalendar(currentMonth, currentYear);
}

 */
