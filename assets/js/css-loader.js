// css-loader.js

/*
    Dynamically load CSS files from a json file
    Make maintaining the CSS styles =MUCH= more maintainable
    by keeping the list of files that need to be included in a single location
    
    ** you can always add a single line to include one CSS file if the page requires a one-off CSS **
*/

document.addEventListener('DOMContentLoaded', function()
{
    loadCssConfigAndRevealBody();
});

async function loadCssConfigAndRevealBody()
{
    const cssConfigUrl = '/assets/json-data/css-head-config.json';
    const maxWaitMilliseconds = 3000;

    try
    {
        const configData = await fetchCssConfig(cssConfigUrl);
        await appendCssLinksAndWait(configData, maxWaitMilliseconds);
    }
    catch(error)
    {
        console.error('Error loading the CSS configuration:', error);
    }

    revealBodyAndSignalReady();
}

async function fetchCssConfig(cssConfigUrl)
{
    const response = await fetch(cssConfigUrl, { cache: 'no-store' });

    if(!response.ok)
    {
        throw new Error('CSS config HTTP ' + response.status);
    }

    return await response.json();
}

async function appendCssLinksAndWait(configData, maxWaitMilliseconds)
{
    if(!configData || !Array.isArray(configData.links)) return;

    const headElement = document.head;
    const loadPromises = configData.links.map(function(linkAttributes)
    {
        return createStylesheetLinkPromise(headElement, linkAttributes);
    });

    await Promise.race([
        Promise.allSettled(loadPromises),
        createTimeoutPromise(maxWaitMilliseconds)
    ]);
}

function createStylesheetLinkPromise(headElement, linkAttributes)
{
    return new Promise(function(resolve)
    {
        const linkElement = document.createElement('link');

        Object.keys(linkAttributes || {}).forEach(function(attributeName)
        {
            linkElement.setAttribute(attributeName, linkAttributes[attributeName]);
        });

        linkElement.onload = function()
        {
            resolve(true);
        };

        linkElement.onerror = function()
        {
            resolve(false);
        };

        headElement.appendChild(linkElement);
    });
}

function createTimeoutPromise(waitMilliseconds)
{
    return new Promise(function(resolve)
    {
        window.setTimeout(function()
        {
            resolve(false);
        }, waitMilliseconds);
    });
}

function revealBodyAndSignalReady()
{
    document.body.style.visibility = 'visible';
    document.dispatchEvent(new Event('rg-css-ready'));
}
