document.addEventListener("DOMContentLoaded", function () {
    fetch("/assets/json-data/amazon-affiliate-items.json")
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById("affiliate-list");
            
            data.forEach((item, index) => {
                const card = document.createElement("div");
                card.className = "card mb-3 shadow-sm";
                
                const headerId = `heading-${index}`;
                const collapseId = `collapse-${index}`;
                
                card.innerHTML = `
          <div class="card-header" id="${headerId}">
            <h2 class="mb-0">
              <button class="btn btn-link text-start w-100 d-flex align-items-center text-decoration-none"
                type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}"
                aria-expanded="false" aria-controls="${collapseId}">
                <span class="toggle-icon me-2">+</span>
                <span>${item.title}</span>
              </button>
            </h2>
          </div>

          <div id="${collapseId}" class="collapse" aria-labelledby="${headerId}" data-bs-parent="#affiliate-list">
            <div class="card-body d-flex flex-column flex-md-row align-items-start" style="background-color: white;">
              <img src="${item.image}" alt="${item.title}" class="img-fluid mb-3 mb-md-0 me-md-3" style="max-width: 200px;">
              <ul class="list-unstyled">
                <li><strong>Description:</strong> ${item.description}</li>
                <li><strong>Link:</strong> <a href="${item.url}" target="_blank">Check Price on Amazon</a></li>
              </ul>
            </div>
          </div>
        `;
                
                container.appendChild(card);
            });
            
            // Toggle +/− icons
            container.addEventListener("shown.bs.collapse", function (e) {
                const icon = e.target.previousElementSibling.querySelector(".toggle-icon");
                if (icon) icon.textContent = "−";
            });
            
            container.addEventListener("hidden.bs.collapse", function (e) {
                const icon = e.target.previousElementSibling.querySelector(".toggle-icon");
                if (icon) icon.textContent = "+";
            });
        })
        .catch(error => {
            console.error("Error loading affiliate items:", error);
        });
});
