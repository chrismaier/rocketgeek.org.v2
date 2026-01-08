// css-loader.js

/*
    Dynamically load CSS files from a json file
    Make maintaining the CSS styles =MUCH= more maintainable
    by keeping the list of files that need to be included in a single location
    
    Key behavior:
    - Preload CSS ASAP (download begins early)
    - Apply CSS at DOMContentLoaded (DOM exists)
    - Reveal body + signal rg-css-ready after CSS applied (or timeout)
*/

const RG_CSS_CONFIG_URL = '/assets/json-data/css-head-config.json';
const RG_CSS_MAX_WAIT_MILLISECONDS = 3000;

let rgCssConfigData = null;
let rgCssConfigLoadFailed = false;

beginCssConfigFetchAndPreload();

document.addEventListener('DOMContentLoaded', function()
{
    applyCssAndRevealBody();
});

function beginCssConfigFetchAndPreload()
{
    fetch(RG_CSS_CONFIG_URL, { cache: 'no-store' })
        .then(function(response)
        {
            if(!response.ok)
            {
                throw new Error('CSS config HTTP ' + response.status);
            }
            return response.json();
        })
        .then(function(configData)
        {
            rgCssConfigData = configData;
            createPreloadLinks(configData);
        })
        .catch(function(error)
        {
            rgCssConfigLoadFailed = true;
            console.error('Error loading the CSS configuration:', error);
        });
}

async function applyCssAndRevealBody()
{
    try
    {
        if(rgCssConfigLoadFailed)
        {
            revealBodyAndSignalReady();
            return;
        }

        const configData = await waitForConfigData(RG_CSS_MAX_WAIT_MILLISECONDS);

        if(!configData)
        {
            revealBodyAndSignalReady();
            return;
        }

        await applyPreloadedCssAndWait(configData, RG_CSS_MAX_WAIT_MILLISECONDS);
    }
    catch(error)
    {
        console.error('Error applying CSS:', error);
    }

    revealBodyAndSignalReady();
}

function waitForConfigData(maxWaitMilliseconds)
{
    return new Promise(function(resolve)
    {
        if(rgCssConfigData)
        {
            resolve(rgCssConfigData);
            return;
        }

        const startTimeMilliseconds = Date.now();

        const pollTimer = window.setInterval(function()
        {
            if(rgCssConfigData)
            {
                window.clearInterval(pollTimer);
                resolve(rgCssConfigData);
                return;
            }

            const elapsedMilliseconds =
                Date.now() - startTimeMilliseconds;

            if(elapsedMilliseconds >= maxWaitMilliseconds)
            {
                window.clearInterval(pollTimer);
                resolve(null);
            }
        }, 25);
    });
}

function createPreloadLinks(configData)
{
    if(!configData || !Array.isArray(configData.links)) return;

    const headElement = document.head;

    configData.links.forEach(function(linkAttributes)
    {
        if(!linkAttributes) return;

        const relValue = (linkAttributes.rel || '').toLowerCase();
        const hrefValue = linkAttributes.href;

        if(relValue !== 'stylesheet' || !hrefValue) return;

        if(document.querySelector('link[rel="preload"][href="' + hrefValue + '"]'))
        {
            return;
        }

        const preloadLink = document.createElement('link');
        preloadLink.setAttribute('rel', 'preload');
        preloadLink.setAttribute('as', 'style');
        preloadLink.setAttribute('href', hrefValue);

        headElement.appendChild(preloadLink);
    });
}

function applyPreloadedCssAndWait(configData, maxWaitMilliseconds)
{
    const headElement = document.head;

    if(!configData || !Array.isArray(configData.links))
    {
        return Promise.resolve();
    }

    const stylesheetPromises = [];

    configData.links.forEach(function(linkAttributes)
    {
        if(!linkAttributes) return;

        const relValue = (linkAttributes.rel || '').toLowerCase();
        const hrefValue = linkAttributes.href;

        if(relValue !== 'stylesheet' || !hrefValue) return;

        const preloadSelector = 'link[rel="preload"][href="' + hrefValue + '"]';
        const preloadLink = document.querySelector(preloadSelector);

        if(preloadLink)
        {
            stylesheetPromises.push(
                switchPreloadToStylesheetAndWait(preloadLink)
            );
            return;
        }

        stylesheetPromises.push(
            appendStylesheetLinkAndWait(headElement, linkAttributes)
        );
    });

    return Promise.race([
        Promise.allSettled(stylesheetPromises),
        createTimeoutPromise(maxWaitMilliseconds)
    ]);
}

function switchPreloadToStylesheetAndWait(preloadLink)
{
    return new Promise(function(resolve)
    {
        preloadLink.onload = function()
        {
            resolve(true);
        };

        preloadLink.onerror = function()
        {
            resolve(false);
        };

        preloadLink.setAttribute('rel', 'stylesheet');
        preloadLink.removeAttribute('as');
    });
}

function appendStylesheetLinkAndWait(headElement, linkAttributes)
{
    return new Promise(function(resolve)
    {
        const linkElement = document.createElement('link');

        Object.keys(linkAttributes).forEach(function(attributeName)
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
    if(document.body)
    {
        document.body.style.visibility = 'visible';
    }

    document.dispatchEvent(new Event('rg-css-ready'));
}
