// affiliate-loader.js

// ==================== START: Load Affiliate Items ====================
document.addEventListener("DOMContentLoaded", () => {
    fetch("assets/json-data/affiliate-items.json")
        .then(response => {
            if (!response.ok) {
                console.error(`❌ Failed to fetch affiliate items. HTTP ${response.status}`);
                return [];
            }
            return response.json();
        })
        .then(items => {
            if (!Array.isArray(items)) {
                console.error("❌ Invalid JSON format: expected an array.");
                return;
            }
            logDuplicateDisplayOrders(items);
            renderAffiliateItems(items);
        })
        .catch(error => {
            console.error("❌ Error loading affiliate items:", error);
        });
});
// ==================== END: Load Affiliate Items ====================


// ==================== START: Duplicate Order Check ====================
function logDuplicateDisplayOrders(items) {
    const seen = new Map();
    for (const item of items) {
        if (!("display_order" in item)) {
            console.warn(`⚠️ Missing display_order for item: "${item.title}"`);
            continue;
        }
        
        const order = item.display_order;
        if (seen.has(order)) {
            console.warn(`⚠️ Duplicate display_order "${order}" for: "${item.title}" and "${seen.get(order)}"`);
        } else {
            seen.set(order, item.title);
        }
    }
}
// ==================== END: Duplicate Order Check ====================


// ==================== START: Render Affiliate Items ====================
function renderAffiliateItems(items) {
    const container = document.getElementById("affiliate-items");
    
    if (!container) {
        console.error("❌ Unable to find #affiliate-items container in DOM.");
        return;
    }
    
    const sortedItems = [...items].sort((a, b) => {
        const orderA = a.display_order ?? 9999;
        const orderB = b.display_order ?? 9999;
        return orderA - orderB;
    });
    
    sortedItems.forEach(item => {
        // Skip invalid items with missing critical fields
        if (!item.title || !item.image || !item.affiliate_url) {
            console.warn(`⚠️ Skipping incomplete item:`, item);
            return;
        }
        
        const col = document.createElement("div");
        col.className = "col";
        
        col.innerHTML = `
            <div class="card h-100 shadow-sm border-0 rounded-3">
                <img src="${item.image}" class="card-img-top img-fluid" alt="${item.title}">
                <div class="card-body d-flex flex-column bg-white text-body">
                    <h5 class="card-title">${item.title}</h5>
                    <p class="card-text">${item.description ?? ""}</p>
                    <form class="mt-auto" action="${item.affiliate_url}" method="get" target="_blank">
                        <button type="submit" class="btn btn-primary btn-user w-100">
                            Check Price
                        </button>
                    </form>
                </div>
            </div>
        `;
        
        
        
        container.appendChild(col);
    });
}
// ==================== END: Render Affiliate Items ====================
