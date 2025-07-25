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
              <button class="btn btn-link text-start w-100 text-decoration-none" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="false" aria-controls="${collapseId}">
                ${item.title}
              </button>
            </h2>
          </div>
          <div id="${collapseId}" class="collapse" aria-labelledby="${headerId}" data-bs-parent="#affiliateItemsContainer">
            <div class="card-body d-flex flex-column flex-md-row align-items-start">
              <img src="${item.image}" alt="${item.title}" class="img-fluid mb-3 mb-md-0 me-md-3" style="max-width: 200px;">
              <div>
                <p>${item.description}</p>
                <a href="${item.url}" target="_blank" class="btn btn-primary mt-2">Check Price on Amazon</a>
              </div>
            </div>
          </div>
        `;
                
                container.appendChild(card);
            });
        })
        .catch(error => {
            console.error("Error loading affiliate items:", error);
        });
});
