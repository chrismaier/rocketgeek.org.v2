document.addEventListener('DOMContentLoaded', function() {
    // Load the JSON data
    fetch('assets/json-data/calendar-events.json')
        .then(response => response.json())
        .then(data => {
            const events = data.events;
            const daysList = document.querySelector('.days');
            
            events.forEach(event => {
                const eventDate = new Date(event.date);
                const dayElements = daysList.children;
                
                for (let i = 0; i < dayElements.length; i++) {
                    const dayElement = dayElements[i];
                    const daySpan = dayElement.querySelector('.date > span');
                    
                    if (daySpan && daySpan.innerText == eventDate.getDate() && !dayElement.classList.contains('outside')) {
                        // Create the event element
                        const eventDiv = document.createElement('div');
                        eventDiv.className = `event ${event.class || 'bg-info'}`;
                        eventDiv.innerHTML = `<span>${event.description}</span>`;
                        
                        // Check if the event spans multiple days
                        if (event.span && event.span > 1) {
                            eventDiv.classList.add(`span-${event.span}`);
                        }
                        
                        // Append the event to the day element
                        dayElement.appendChild(eventDiv);
                        break;
                    }
                }
            });
        })
        .catch(error => console.error('Error loading events:', error));
});
