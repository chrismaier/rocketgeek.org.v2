// burnsim-tabs.js

/* Begin BurnSim tabs - constants */
const BurnsimTabsConfig = {
  storageKey: 'burnsim-active-tab',
  tabButtonIds: ['bsFormulaTab', 'bsMotorTab', 'bsEngTab']
};
/* End BurnSim tabs - constants */

/* Begin BurnSim tabs - helpers */
function getElementByIdStrict(elementId) {
  const element = document.getElementById(elementId);
  return element || null;
}

function getFirstExistingTabButton() {
  for (let index = 0; index < BurnsimTabsConfig.tabButtonIds.length; index += 1) {
    const tabButtonId = BurnsimTabsConfig.tabButtonIds[index];
    const tabButtonElement = getElementByIdStrict(tabButtonId);
    if (tabButtonElement) return tabButtonElement;
  }
  return null;
}

function saveActiveTabId(tabButtonId) {
  try {
    window.localStorage.setItem(BurnsimTabsConfig.storageKey, tabButtonId);
  } catch (storageError) {
    return;
  }
}

function loadActiveTabId() {
  try {
    return window.localStorage.getItem(BurnsimTabsConfig.storageKey);
  } catch (storageError) {
    return null;
  }
}

function activateTabButton(tabButtonElement) {
  if (!tabButtonElement) return;

  const hasBootstrap =
    typeof window.bootstrap === 'object' &&
    window.bootstrap !== null &&
    typeof window.bootstrap.Tab === 'function';

  if (hasBootstrap) {
    const bootstrapTab = new window.bootstrap.Tab(tabButtonElement);
    bootstrapTab.show();
    return;
  }

  tabButtonElement.click();
}
/* End BurnSim tabs - helpers */

/* Begin BurnSim tabs - wiring */
function wireTabPersistence() {
  for (let index = 0; index < BurnsimTabsConfig.tabButtonIds.length; index += 1) {
    const tabButtonId = BurnsimTabsConfig.tabButtonIds[index];
    const tabButtonElement = getElementByIdStrict(tabButtonId);
    if (!tabButtonElement) continue;

    tabButtonElement.addEventListener('shown.bs.tab', function onTabShown() {
      saveActiveTabId(tabButtonId);
    });

    tabButtonElement.addEventListener('click', function onTabClick() {
      saveActiveTabId(tabButtonId);
    });
  }
}

function restoreActiveTab() {
  const savedTabId = loadActiveTabId();
  if (!savedTabId) return;

  const savedTabButtonElement = getElementByIdStrict(savedTabId);
  if (!savedTabButtonElement) return;

  activateTabButton(savedTabButtonElement);
}

function initBurnsimTabs() {
  const firstTabButtonElement = getFirstExistingTabButton();
  if (!firstTabButtonElement) return;

  wireTabPersistence();
  restoreActiveTab();
}
/* End BurnSim tabs - wiring */

/* Begin BurnSim tabs - init */
document.addEventListener('DOMContentLoaded', function onDomReady() {
  initBurnsimTabs();
});
/* End BurnSim tabs - init */
