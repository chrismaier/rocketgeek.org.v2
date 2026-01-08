// site-search.js

/* Begin Site Search Configuration */
const RG_SITE_SEARCH_CONFIG = {
  searchPagePath: "/search.html",
  searchIndexUrl: "/assets/json-data/search-index.json",
  maxResults: 50,
  minQueryLength: 2,
  topbarContainerSelector: ".navbar-search",
  topbarInputSelector: ".form-control",
  searchPageInputId: "rgSearchInput",
  searchPageFormId: "rgSearchForm",
  searchPageResultsId: "rgSearchResults",
  searchPageSummaryId: "rgSearchSummary"
};
/* End Site Search Configuration */

/* Begin Site Search Utilities */
function rgQs(selector, rootElement) {
  const baseElement = rootElement || document;
  return baseElement.querySelector(selector);
}

function rgQsa(selector, rootElement) {
  const baseElement = rootElement || document;
  return Array.from(baseElement.querySelectorAll(selector));
}

function rgGetQueryParam(paramName) {
  const urlParams = new URLSearchParams(window.location.search || "");
  return (urlParams.get(paramName) || "").trim();
}

function rgNormalizeQuery(queryValue) {
  return (queryValue || "")
    .toString()
    .trim()
    .replace(/\s+/g, " ");
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

function rgSetText(element, textValue) {
  if (!element) return;
  element.textContent = (textValue || "").toString();
}

function rgBuildUrlWithQuery(pathValue, queryValue) {
  const safeQuery = rgNormalizeQuery(queryValue);
  const encodedQuery = encodeURIComponent(safeQuery);
  return `${pathValue}?q=${encodedQuery}`;
}

function rgIsSearchPage() {
  const pathValue = (window.location.pathname || "").toLowerCase();
  return pathValue.endsWith(RG_SITE_SEARCH_CONFIG.searchPagePath);
}
/* End Site Search Utilities */

/* Begin Search Index Loading */
async function rgLoadSearchIndex() {
  const cacheKey = "rg_search_index_cache_v1";
  const cachedText = sessionStorage.getItem(cacheKey);

  if (cachedText) {
    try {
      const cachedData = JSON.parse(cachedText);
      if (Array.isArray(cachedData)) return cachedData;
    } catch (error) {
      sessionStorage.removeItem(cacheKey);
    }
  }

  const response = await fetch(RG_SITE_SEARCH_CONFIG.searchIndexUrl, {
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
  return normalized.split(" ").filter((term) => term.length > 0);
}

function rgSafeField(recordValue) {
  return (recordValue || "").toString();
}

function rgScoreRecord(recordObject, queryTokens, phraseLower) {
  const titleText = rgSafeField(recordObject.title).toLowerCase();
  const descriptionText = rgSafeField(recordObject.description).toLowerCase();
  const contentText = rgSafeField(recordObject.content).toLowerCase();
  const urlText = rgSafeField(recordObject.url).toLowerCase();

  let scoreValue = 0;

  if (phraseLower && phraseLower.length > 0) {
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

  if (normalizedQuery.length < RG_SITE_SEARCH_CONFIG.minQueryLength) {
    return [];
  }

  const resultsArray = [];
  for (let i = 0; i < indexArray.length; i++) {
    const recordObject = indexArray[i];
    const scoreValue = rgScoreRecord(recordObject, queryTokens, phraseLower);

    if (scoreValue <= 0) continue;

    resultsArray.push({
      score: scoreValue,
      record: recordObject
    });
  }

  resultsArray.sort((leftItem, rightItem) => {
    if (rightItem.score !== leftItem.score) {
      return rightItem.score - leftItem.score;
    }

    const leftTitle = rgSafeField(leftItem.record.title).toLowerCase();
    const rightTitle = rgSafeField(rightItem.record.title).toLowerCase();

    if (leftTitle < rightTitle) return -1;
    if (leftTitle > rightTitle) return 1;
    return 0;
  });

  return resultsArray.slice(0, RG_SITE_SEARCH_CONFIG.maxResults);
}
/* End Search Scoring */

/* Begin Search Results Rendering */
function rgRenderResults(queryValue, resultsArray) {
  const resultsContainer = document.getElementById(
    RG_SITE_SEARCH_CONFIG.searchPageResultsId
  );
  const summaryContainer = document.getElementById(
    RG_SITE_SEARCH_CONFIG.searchPageSummaryId
  );

  if (!resultsContainer) return;

  const normalizedQuery = rgNormalizeQuery(queryValue);
  const resultsCount = resultsArray.length;

  if (summaryContainer) {
    if (normalizedQuery.length < RG_SITE_SEARCH_CONFIG.minQueryLength) {
      rgSetText(summaryContainer, "Enter a search term.");
    } else {
      rgSetText(
        summaryContainer,
        `Results: ${resultsCount} (showing up to ` +
          `${RG_SITE_SEARCH_CONFIG.maxResults})`
      );
    }
  }

  if (normalizedQuery.length < RG_SITE_SEARCH_CONFIG.minQueryLength) {
    resultsContainer.innerHTML = "";
    return;
  }

  if (resultsCount === 0) {
    resultsContainer.innerHTML =
      `<div class="alert alert-warning" role="alert">` +
      `No results found for <strong>${rgEscapeHtml(normalizedQuery)}</strong>.` +
      `</div>`;
    return;
  }

  const htmlParts = [];
  for (let i = 0; i < resultsArray.length; i++) {
    const recordObject = resultsArray[i].record;

    const urlValue = rgSafeField(recordObject.url) || "#";
    const titleValue = rgSafeField(recordObject.title) || urlValue;
    const descriptionValue = rgSafeField(recordObject.description);
    const contentValue = rgSafeField(recordObject.content);
    const sectionValue = rgSafeField(recordObject.section);

    const snippetValue = descriptionValue || contentValue || "";

    htmlParts.push(
      `<div class="card mb-3">` +
        `<div class="card-body">` +
          `<h5 class="card-title mb-1">` +
            `<a href="${rgEscapeHtml(urlValue)}">` +
              `${rgEscapeHtml(titleValue)}` +
            `</a>` +
          `</h5>` +
          (sectionValue
            ? `<div class="small text-muted mb-2">` +
                `${rgEscapeHtml(sectionValue)}` +
              `</div>`
            : "") +
          (snippetValue
            ? `<p class="card-text mb-2">` +
                `${rgEscapeHtml(snippetValue)}` +
              `</p>`
            : "") +
          `<div class="small">` +
            `<a href="${rgEscapeHtml(urlValue)}">` +
              `${rgEscapeHtml(urlValue)}` +
            `</a>` +
          `</div>` +
        `</div>` +
      `</div>`
    );
  }

  resultsContainer.innerHTML = htmlParts.join("");
}
/* End Search Results Rendering */

/* Begin Topbar Search Wiring */
function rgInitTopbarSearch() {
  const topbarContainers = rgQsa(RG_SITE_SEARCH_CONFIG.topbarContainerSelector);
  if (topbarContainers.length === 0) return;

  for (let i = 0; i < topbarContainers.length; i++) {
    const containerElement = topbarContainers[i];

    const inputElement = rgQs(
      RG_SITE_SEARCH_CONFIG.topbarInputSelector,
      containerElement
    );

    if (!inputElement) continue;

    const formElement = inputElement.closest("form");
    if (!formElement) continue;

    const submitHandler = function (event) {
      if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
      }

      const queryValue = rgNormalizeQuery(inputElement.value || "");
      if (!queryValue) return;

      const destinationUrl = rgBuildUrlWithQuery(
        RG_SITE_SEARCH_CONFIG.searchPagePath,
        queryValue
      );

      window.location.href = destinationUrl;
    };

    formElement.addEventListener("submit", submitHandler);
  }
}
/* End Topbar Search Wiring */

/* Begin Search Page Wiring */
async function rgRunSearchPage() {
  const searchForm = document.getElementById(
    RG_SITE_SEARCH_CONFIG.searchPageFormId
  );
  const searchInput = document.getElementById(
    RG_SITE_SEARCH_CONFIG.searchPageInputId
  );
  const resultsContainer = document.getElementById(
    RG_SITE_SEARCH_CONFIG.searchPageResultsId
  );

  if (!searchInput || !resultsContainer) return;

  const initialQuery = rgGetQueryParam("q");
  if (initialQuery) searchInput.value = initialQuery;

  let indexArray = [];
  try {
    indexArray = await rgLoadSearchIndex();
  } catch (error) {
    resultsContainer.innerHTML =
      `<div class="alert alert-danger" role="alert">` +
      `Search index failed to load.` +
      `</div>`;
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
      const nextUrl = rgBuildUrlWithQuery(
        RG_SITE_SEARCH_CONFIG.searchPagePath,
        queryValue
      );

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
/* End Search Page Wiring */

/* Begin Site Search Bootstrap */
document.addEventListener("DOMContentLoaded", function () {
  rgInitTopbarSearch();

  if (rgIsSearchPage()) {
    rgRunSearchPage();
  }
});
/* End Site Search Bootstrap */
