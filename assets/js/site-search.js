// site-search.js

/* Begin Site Search Configuration */
const RgSiteSearchConfig = {
  resultsPagePath: "/search-results.html",
  searchIndexUrl: "/assets/json-data/search-index.json",
  maxResults: 50,
  minQueryLength: 2,
  topbarContainerSelector: ".navbar-search",
  topbarInputSelector: "input[type='search'], input.form-control, input",
  resultsPageFormId: "rgSearchResultsForm",
  resultsPageInputId: "rgSearchResultsInput",
  resultsPageSummaryId: "rgSearchSummary",
  resultsPageResultsId: "rgSearchResults"
};
/* End Site Search Configuration */

/* Begin Site Search Utilities */
function rgQuerySelector(selector, rootElement) {
  const baseElement = rootElement || document;
  return baseElement.querySelector(selector);
}

function rgQuerySelectorAll(selector, rootElement) {
  const baseElement = rootElement || document;
  return Array.from(baseElement.querySelectorAll(selector));
}

function rgNormalizeQuery(queryValue) {
  return (queryValue || "")
    .toString()
    .trim()
    .replace(/\s+/g, " ");
}

function rgGetQueryParam(paramName) {
  const urlParams = new URLSearchParams(window.location.search || "");
  return (urlParams.get(paramName) || "").trim();
}

function rgEscapeHtml(unsafeText) {
  const textValue = (unsafeText || "").toString();
  return textValue
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function rgBuildResultsUrl(queryValue) {
  const normalizedQuery = rgNormalizeQuery(queryValue);
  const encodedQuery = encodeURIComponent(normalizedQuery);
  return `${RgSiteSearchConfig.resultsPagePath}?q=${encodedQuery}`;
}

function rgIsResultsPage() {
  const pathValue = (window.location.pathname || "").toLowerCase();
  return pathValue.endsWith(RgSiteSearchConfig.resultsPagePath);
}

function rgSetText(targetElement, textValue) {
  if (!targetElement) return;
  targetElement.textContent = (textValue || "").toString();
}
/* End Site Search Utilities */

/* Begin Search Index Loading */
async function rgLoadSearchIndex() {
  const cacheKey = "rg_site_search_index_cache_v1";
  const cachedText = sessionStorage.getItem(cacheKey);

  if (cachedText) {
    try {
      const cachedData = JSON.parse(cachedText);
      if (Array.isArray(cachedData)) return cachedData;
    } catch (error) {
      sessionStorage.removeItem(cacheKey);
    }
  }

  const response = await fetch(RgSiteSearchConfig.searchIndexUrl, {
    cache: "no-cache"
  });

  if (!response.ok) {
    throw new Error(`Index fetch failed: HTTP ${response.status}`);
  }

  const indexData = await response.json();
  if (!Array.isArray(indexData)) {
    throw new Error("Index JSON is not an array");
  }

  sessionStorage.setItem(cacheKey, JSON.stringify(indexData));
  return indexData;
}
/* End Search Index Loading */

/* Begin Search Scoring */
function rgTokenize(queryValue) {
  const normalized = rgNormalizeQuery(queryValue).toLowerCase();
  if (!normalized) return [];
  return normalized.split(" ").filter((termValue) => termValue.length > 0);
}

function rgSafeText(value) {
  return (value || "").toString();
}

function rgScoreRecord(recordObject, queryTokens, phraseLower) {
  const titleText = rgSafeText(recordObject.title).toLowerCase();
  const descriptionText = rgSafeText(recordObject.description).toLowerCase();
  const contentText = rgSafeText(recordObject.content).toLowerCase();
  const urlText = rgSafeText(recordObject.url).toLowerCase();

  let scoreValue = 0;

  if (phraseLower) {
    if (titleText.includes(phraseLower)) scoreValue += 30;
    if (descriptionText.includes(phraseLower)) scoreValue += 15;
    if (contentText.includes(phraseLower)) scoreValue += 6;
    if (urlText.includes(phraseLower)) scoreValue += 2;
  }

  for (let i = 0; i < queryTokens.length; i++) {
    const tokenValue = queryTokens[i];

    if (titleText.includes(tokenValue)) scoreValue += 10;
    if (descriptionText.includes(tokenValue)) scoreValue += 5;
    if (contentText.includes(tokenValue)) scoreValue += 2;
    if (urlText.includes(tokenValue)) scoreValue += 1;
  }

  return scoreValue;
}

function rgSearchIndex(indexArray, queryValue) {
  const normalizedQuery = rgNormalizeQuery(queryValue);
  const phraseLower = normalizedQuery.toLowerCase();
  const queryTokens = rgTokenize(normalizedQuery);

  if (normalizedQuery.length < RgSiteSearchConfig.minQueryLength) {
    return [];
  }

  const scoredResults = [];
  for (let i = 0; i < indexArray.length; i++) {
    const recordObject = indexArray[i];
    const scoreValue = rgScoreRecord(recordObject, queryTokens, phraseLower);

    if (scoreValue <= 0) continue;

    scoredResults.push({
      score: scoreValue,
      record: recordObject
    });
  }

  scoredResults.sort((leftItem, rightItem) => {
    if (rightItem.score !== leftItem.score) {
      return rightItem.score - leftItem.score;
    }

    const leftTitle = rgSafeText(leftItem.record.title).toLowerCase();
    const rightTitle = rgSafeText(rightItem.record.title).toLowerCase();

    if (leftTitle < rightTitle) return -1;
    if (leftTitle > rightTitle) return 1;
    return 0;
  });

  return scoredResults.slice(0, RgSiteSearchConfig.maxResults);
}
/* End Search Scoring */

/* Begin Results Rendering */
function rgRenderResults(queryValue, resultsArray) {
  const resultsContainer = document.getElementById(
    RgSiteSearchConfig.resultsPageResultsId
  );
  const summaryContainer = document.getElementById(
    RgSiteSearchConfig.resultsPageSummaryId
  );

  if (!resultsContainer) return;

  const normalizedQuery = rgNormalizeQuery(queryValue);
  const resultsCount = resultsArray.length;

  if (summaryContainer) {
    if (normalizedQuery.length < RgSiteSearchConfig.minQueryLength) {
      rgSetText(summaryContainer, "Enter a search term.");
    } else {
      const summaryText =
        `Results: ${resultsCount} (showing up to ` +
        `${RgSiteSearchConfig.maxResults})`;
      rgSetText(summaryContainer, summaryText);
    }
  }

  if (normalizedQuery.length < RgSiteSearchConfig.minQueryLength) {
    resultsContainer.innerHTML = "";
    return;
  }

  if (resultsCount === 0) {
    const noResultsHtml =
      `<div class="alert alert-warning" role="alert">` +
      `No results found for <strong>${rgEscapeHtml(normalizedQuery)}</strong>.` +
      `</div>`;
    resultsContainer.innerHTML = noResultsHtml;
    return;
  }

  const htmlParts = [];
  for (let i = 0; i < resultsArray.length; i++) {
    const recordObject = resultsArray[i].record;

    const urlValue = rgSafeText(recordObject.url) || "#";
    const titleValue = rgSafeText(recordObject.title) || urlValue;
    const descriptionValue = rgSafeText(recordObject.description);
    const contentValue = rgSafeText(recordObject.content);
    const sectionValue = rgSafeText(recordObject.section);

    const snippetValue = descriptionValue || contentValue || "";

    const sectionHtml = sectionValue
      ? `<div class="small text-muted mb-2">${rgEscapeHtml(sectionValue)}</div>`
      : "";

    const snippetHtml = snippetValue
      ? `<p class="card-text mb-2">${rgEscapeHtml(snippetValue)}</p>`
      : "";

    const cardHtml =
      `<div class="card mb-3">` +
        `<div class="card-body">` +
          `<h5 class="card-title mb-1">` +
            `<a href="${rgEscapeHtml(urlValue)}">` +
              `${rgEscapeHtml(titleValue)}` +
            `</a>` +
          `</h5>` +
          sectionHtml +
          snippetHtml +
          `<div class="small">` +
            `<a href="${rgEscapeHtml(urlValue)}">` +
              `${rgEscapeHtml(urlValue)}` +
            `</a>` +
          `</div>` +
        `</div>` +
      `</div>`;

    htmlParts.push(cardHtml);
  }

  resultsContainer.innerHTML = htmlParts.join("");
}
/* End Results Rendering */

/* Begin Topbar Search Wiring */
function rgInitTopbarSearchRedirect() {
  const topbarContainers = rgQuerySelectorAll(
    RgSiteSearchConfig.topbarContainerSelector
  );

  if (topbarContainers.length === 0) return;

  for (let i = 0; i < topbarContainers.length; i++) {
    const containerElement = topbarContainers[i];

    const inputElement = rgQuerySelector(
      RgSiteSearchConfig.topbarInputSelector,
      containerElement
    );

    if (!inputElement) continue;

    const formElement = inputElement.closest("form");
    if (!formElement) continue;

    formElement.addEventListener("submit", function (event) {
      if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
      }

      const queryValue = rgNormalizeQuery(inputElement.value || "");
      if (!queryValue) return;

      window.location.href = rgBuildResultsUrl(queryValue);
    });
  }
}
/* End Topbar Search Wiring */

/* Begin Results Page Wiring */
async function rgInitResultsPage() {
  const searchForm = document.getElementById(
    RgSiteSearchConfig.resultsPageFormId
  );
  const searchInput = document.getElementById(
    RgSiteSearchConfig.resultsPageInputId
  );
  const resultsContainer = document.getElementById(
    RgSiteSearchConfig.resultsPageResultsId
  );

  if (!searchInput || !resultsContainer) return;

  const initialQuery = rgGetQueryParam("q");
  if (initialQuery) searchInput.value = initialQuery;

  let indexArray = [];
  try {
    indexArray = await rgLoadSearchIndex();
  } catch (error) {
    const errorHtml =
      `<div class="alert alert-danger" role="alert">` +
      `Search index failed to load.` +
      `</div>`;
    resultsContainer.innerHTML = errorHtml;
    return;
  }

  const executeSearch = function () {
    const queryValue = rgNormalizeQuery(searchInput.value || "");
    const resultsArray = rgSearchIndex(indexArray, queryValue);
    rgRenderResults(queryValue, resultsArray);
  };

  if (searchForm) {
    searchForm.addEventListener("submit", function (event) {
      if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
      }

      const queryValue = rgNormalizeQuery(searchInput.value || "");
      const nextUrl = rgBuildResultsUrl(queryValue);

      window.history.pushState({ q: queryValue }, "", nextUrl);
      executeSearch();
    });
  }

  window.addEventListener("popstate", function () {
    const currentQuery = rgGetQueryParam("q");
    searchInput.value = currentQuery;
    executeSearch();
  });

  executeSearch();
}
/* End Results Page Wiring */

/* Begin Site Search Bootstrap */
document.addEventListener("DOMContentLoaded", function () {
  rgInitTopbarSearchRedirect();

  if (rgIsResultsPage()) {
    rgInitResultsPage();
  }
});
/* End Site Search Bootstrap */
