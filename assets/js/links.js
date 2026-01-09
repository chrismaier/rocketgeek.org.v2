// links.js

document.addEventListener('DOMContentLoaded', function () {
    fetch('/assets/json-data/other-links.json')
        .then(response => response.json())
        .then(data => {
            const linkContainer = document.querySelector('#link-container');
            
            const isPdfUrl = (rawUrl) => {
                if (!rawUrl) {
                    return false;
                }
                
                const normalizedUrl = String(rawUrl).toLowerCase();
                const strippedUrl = normalizedUrl.split('?')[0].split('#')[0];
                return strippedUrl.endsWith('.pdf');
            };
            
            const getLinkType = (rawUrl) => {
                try {
                    const resolvedUrl = new URL(rawUrl, window.location.href);
                    return resolvedUrl.origin === window.location.origin ? 'internal' : 'external';
                } catch (error) {
                    return 'unknown';
                }
            };
            
            const createBadge = (text, className, titleText) => {
                const badge = document.createElement('span');
                badge.className = `link-badge ${className}`;
                badge.textContent = text;
                
                if (titleText) {
                    badge.title = titleText;
                }
                
                return badge;
            };
            
            data.forEach(link => {
                const card = document.createElement('div');
                card.className = 'link-card';
                
                /* Begin card click behavior */
                card.onclick = () => {
                    window.open(link.url, '_blank', 'noopener,noreferrer');
                };
                /* End card click behavior */
                
                /* Begin title */
                const title = document.createElement('h3');
                title.className = 'link-title';
                title.textContent = link.title || '';
                /* End title */
                
                /* Begin badges */
                const badgesContainer = document.createElement('div');
                badgesContainer.className = 'link-badges';
                
                const pdfDetected = isPdfUrl(link.url);
                const linkType = getLinkType(link.url);
                
                if (pdfDetected) {
                    badgesContainer.appendChild(
                        createBadge('PDF', 'link-badge-pdf', 'This link opens a PDF document')
                    );
                }
                
                if (linkType === 'external') {
                    badgesContainer.appendChild(
                        createBadge('External', 'link-badge-external', 'Opens an external site in a new tab')
                    );
                } else if (linkType === 'internal') {
                    badgesContainer.appendChild(
                        createBadge('Internal', 'link-badge-internal', 'Opens a RocketGeek page in a new tab')
                    );
                } else {
                    badgesContainer.appendChild(
                        createBadge('Link', 'link-badge-unknown', 'Opens in a new tab')
                    );
                }
                /* End badges */
                
                /* Begin link anchor */
                const anchorParagraph = document.createElement('p');
                anchorParagraph.className = 'link-anchor';
                
                const anchor = document.createElement('a');
                anchor.className = 'link-anchor-link';
                anchor.href = link.url;
                anchor.target = '_blank';
                anchor.rel = 'noopener noreferrer';
                
                anchor.textContent = link.link_anchor || link.title || link.url || '';
                
                /* Prevent double navigation */
                anchor.onclick = (event) => {
                    event.stopPropagation();
                };
                
                anchorParagraph.appendChild(anchor);
                /* End link anchor */
                
                /* Begin description */
                const description = document.createElement('p');
                description.className = 'link-description';
                description.textContent = link.description || '';
                /* End description */
                
                card.appendChild(title);
                card.appendChild(badgesContainer);
                card.appendChild(anchorParagraph);
                card.appendChild(description);
                
                linkContainer.appendChild(card);
            });
        })
        .catch(error => console.error('Error fetching the links:', error));
});
