// parse-bs-formula.js

/* Begin Parse BurnSim Formulas - constants */
const BurnsimUiIds = {
  formId: 'burnsimParseForm',
  rawInputId: 'burnsimRawInput',
  fileInputId: 'burnsimFileInput',
  chooseFileButtonId: 'burnsimChooseFileButton',
  chosenFileNameId: 'burnsimChosenFileName',
  parseButtonId: 'burnsimParseButton',
  clearButtonId: 'burnsimClearButton',
  statusBannerId: 'burnsimParseStatus',
  tableId: 'burnsimPropellantTable',
  tableBodyId: 'burnsimPropellantTableBody'
};

const BurnsimSchema = {
  schema: 'burnsim-propellants-json',
  schemaVersion: '1.0'
};

const BurnsimRanges = {
  isp_star: { min: 0.000000001, max: 10000 },
  burn_rate_a: { min: 0.0000000000001, max: 1000000 },
  burn_rate_n: { min: 0, max: 1.5 },
  density: { min: 0.000000001, max: 1000 },
  specific_heat_ratio: { min: 1.0, max: 2.0 }
};
/* End Parse BurnSim Formulas - constants */

/* Begin Parse BurnSim Formulas - state */
const BurnsimState = {
  parsedWrapper: null,
  propellants: [],
  sort: {
    key: null,
    direction: 'asc'
  }
};
/* End Parse BurnSim Formulas - state */

/* Begin Parse BurnSim Formulas - DOM helpers */
function getElementByIdStrict(elementId) {
  const element = document.getElementById(elementId);
  return element || null;
}

function setBannerHidden(bannerElement) {
  if (!bannerElement) return;

  bannerElement.classList.add('d-none');
  bannerElement.classList.remove('alert-success');
  bannerElement.classList.remove('alert-warning');
  bannerElement.classList.remove('alert-danger');
  bannerElement.textContent = '';
}

function setBannerSuccess(bannerElement, messageText) {
  if (!bannerElement) return;

  bannerElement.classList.remove('d-none');
  bannerElement.classList.remove('alert-warning');
  bannerElement.classList.remove('alert-danger');
  bannerElement.classList.add('alert-success');
  bannerElement.textContent = messageText;
}

function setBannerWarning(bannerElement, messageText) {
  if (!bannerElement) return;

  bannerElement.classList.remove('d-none');
  bannerElement.classList.remove('alert-success');
  bannerElement.classList.remove('alert-danger');
  bannerElement.classList.add('alert-warning');
  bannerElement.textContent = messageText;
}

function setBannerError(bannerElement, messageText) {
  if (!bannerElement) return;

  bannerElement.classList.remove('d-none');
  bannerElement.classList.remove('alert-success');
  bannerElement.classList.remove('alert-warning');
  bannerElement.classList.add('alert-danger');
  bannerElement.textContent = messageText;
}

function showTable(tableElement) {
  if (!tableElement) return;
  tableElement.classList.remove('d-none');
}

function hideTable(tableElement) {
  if (!tableElement) return;
  tableElement.classList.add('d-none');
}

function clearTableBody(tableBodyElement) {
  if (!tableBodyElement) return;
  tableBodyElement.innerHTML = '';
}
/* End Parse BurnSim Formulas - DOM helpers */

/* Begin Parse BurnSim Formulas - formatting */
function safeTrim(inputValue) {
  if (typeof inputValue !== 'string') return '';
  return inputValue.trim();
}

function isFiniteNumber(parsedNumber) {
  return typeof parsedNumber === 'number' && Number.isFinite(parsedNumber);
}

function parseNumberStrict(valueText) {
  const trimmedText = safeTrim(valueText);
  if (!trimmedText) return { ok: false, value: null };

  const parsedValue = Number(trimmedText);
  if (!isFiniteNumber(parsedValue)) return { ok: false, value: null };

  return { ok: true, value: parsedValue };
}

function roundToDecimals(valueNumber, decimalsCount) {
  const decimals = typeof decimalsCount === 'number' ? decimalsCount : 0;
  if (!isFiniteNumber(valueNumber)) return '';

  const multiplier = Math.pow(10, decimals);
  const roundedValue = Math.round(valueNumber * multiplier) / multiplier;
  const fixedText = roundedValue.toFixed(decimals);

  return fixedText.replace(/\.?0+$/, '');
}

function displaySpecificHeatRatio(rawTextValue) {
  const parsed = parseNumberStrict(rawTextValue);
  if (!parsed.ok) return safeTrim(rawTextValue);

  return roundToDecimals(parsed.value, 8);
}

function displayAsGiven(rawTextValue) {
  return safeTrim(rawTextValue);
}
/* End Parse BurnSim Formulas - formatting */

/* Begin Parse BurnSim Formulas - ID sanitization */
function sanitizeToPropellantId(propellantName) {
  const trimmedName = safeTrim(propellantName);
  const lowerName = trimmedName.toLowerCase();
  const withUnderscores = lowerName.replace(/\s+/g, '_');
  const onlySafeChars = withUnderscores.replace(/[^a-z0-9_]/g, '_');
  const collapsed = onlySafeChars.replace(/_+/g, '_');
  const stripped = collapsed.replace(/^_+|_+$/g, '');

  return stripped || 'unknown';
}

function applyDupeSuffix(baseId, dupeIndex) {
  const indexNumber = typeof dupeIndex === 'number' ? dupeIndex : 2;
  return baseId + '_dupe' + String(indexNumber);
}
/* End Parse BurnSim Formulas - ID sanitization */

/* Begin Parse BurnSim Formulas - XML parsing */
function parseXmlDocument(sourceText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(sourceText, 'text/xml');
  const parseError = doc.getElementsByTagName('parsererror');

  if (parseError && parseError.length > 0) return { ok: false, doc: null };

  return { ok: true, doc: doc };
}

function parsePropellantsForgiving(sourceText) {
  const firstAttempt = parseXmlDocument(sourceText);
  if (firstAttempt.ok) return { ok: true, doc: firstAttempt.doc };

  const wrappedText = '<Root>' + sourceText + '</Root>';
  const secondAttempt = parseXmlDocument(wrappedText);
  if (secondAttempt.ok) return { ok: true, doc: secondAttempt.doc };

  return { ok: false, doc: null };
}

function getPropellantNodes(xmlDoc) {
  if (!xmlDoc) return [];
  const nodes = xmlDoc.getElementsByTagName('Propellant');

  return nodes ? Array.from(nodes) : [];
}
/* End Parse BurnSim Formulas - XML parsing */

/* Begin Parse BurnSim Formulas - validation */
function validateRangeWarnings(propellantRecord, warningsList) {
  const warnings = Array.isArray(warningsList) ? warningsList : [];
  const ranges = BurnsimRanges;

  const fieldsToCheck = [
    'isp_star',
    'burn_rate_a',
    'burn_rate_n',
    'density',
    'specific_heat_ratio'
  ];

  for (let i = 0; i < fieldsToCheck.length; i += 1) {
    const fieldKey = fieldsToCheck[i];
    const range = ranges[fieldKey];
    const value = propellantRecord[fieldKey];

    if (!range) continue;
    if (!isFiniteNumber(value)) continue;

    if (value < range.min || value > range.max) {
      warnings.push(
        'Value out of expected range for ' +
        fieldKey +
        ' on ' +
        propellantRecord.propellant_id
      );
    }
  }

  return warnings;
}

function buildWrapper(sourceType, originalFilename) {
  const utcNow = new Date().toISOString();

  return {
    schema: BurnsimSchema.schema,
    schema_version: BurnsimSchema.schemaVersion,
    source: {
      source_type: sourceType,
      original_filename: originalFilename || '',
      ingested_utc: utcNow
    },
    parse: {
      status: 'error',
      errors: [],
      warnings: []
    },
    propellants: []
  };
}
/* End Parse BurnSim Formulas - validation */

/* Begin Parse BurnSim Formulas - extraction */
function extractPropellantFromNode(propellantNode) {
  const nameText = propellantNode.getAttribute('Name');
  const ispText = propellantNode.getAttribute('ISPStar');
  const aText = propellantNode.getAttribute('A');
  const nText = propellantNode.getAttribute('N');
  const densityText = propellantNode.getAttribute('Density');
  const gammaText = propellantNode.getAttribute('SpecificHeatRatio');

  const notesNode = propellantNode.getElementsByTagName('Notes');
  const notesText = notesNode && notesNode.length > 0 ?
    safeTrim(notesNode[0].textContent || '') :
    '';

  return {
    raw: {
      name: nameText,
      isp_star: ispText,
      burn_rate_a: aText,
      burn_rate_n: nText,
      density: densityText,
      specific_heat_ratio: gammaText
    },
    notes: notesText
  };
}

function validateAndNormalizePropellant(extractedPropellant, indexNumber) {
  const errors = [];
  const raw = extractedPropellant.raw;

  const nameValue = safeTrim(raw.name);
  if (!nameValue) errors.push('Missing Name on propellant #' + indexNumber);

  const ispParsed = parseNumberStrict(raw.isp_star);
  const aParsed = parseNumberStrict(raw.burn_rate_a);
  const nParsed = parseNumberStrict(raw.burn_rate_n);
  const densityParsed = parseNumberStrict(raw.density);
  const gammaParsed = parseNumberStrict(raw.specific_heat_ratio);

  if (!ispParsed.ok) errors.push('Invalid ISPStar on ' + nameValue);
  if (!aParsed.ok) errors.push('Invalid A on ' + nameValue);
  if (!nParsed.ok) errors.push('Invalid N on ' + nameValue);
  if (!densityParsed.ok) errors.push('Invalid Density on ' + nameValue);
  if (!gammaParsed.ok) errors.push('Invalid SpecificHeatRatio on ' + nameValue);

  if (errors.length > 0) return { ok: false, record: null, errors: errors };

  const baseId = sanitizeToPropellantId(nameValue);

  const record = {
    propellant_id: baseId,
    name: nameValue,
    isp_star: ispParsed.value,
    burn_rate_a: aParsed.value,
    burn_rate_n: nParsed.value,
    density: densityParsed.value,
    specific_heat_ratio: gammaParsed.value,
    notes: extractedPropellant.notes || '',
    original_index: indexNumber,
    display: {
      Name: displayAsGiven(nameValue),
      ISPStar: displayAsGiven(raw.isp_star),
      A: displayAsGiven(raw.burn_rate_a),
      N: displayAsGiven(raw.burn_rate_n),
      Density: displayAsGiven(raw.density),
      SpecificHeatRatio: displaySpecificHeatRatio(raw.specific_heat_ratio)
    }
  };

  return { ok: true, record: record, errors: [] };
}

function applyDuplicateIdPolicy(propellantsList, warningsList) {
  const warnings = Array.isArray(warningsList) ? warningsList : [];
  const usedIds = {};
  const baseCounts = {};

  for (let i = 0; i < propellantsList.length; i += 1) {
    const propellant = propellantsList[i];
    const baseId = propellant.propellant_id;

    if (!Object.prototype.hasOwnProperty.call(usedIds, baseId)) {
      usedIds[baseId] = true;
      baseCounts[baseId] = 1;
      continue;
    }

    baseCounts[baseId] = (baseCounts[baseId] || 1) + 1;
    const dupeIndex = baseCounts[baseId];
    const newId = applyDupeSuffix(baseId, dupeIndex);

    propellant.propellant_id = newId;
    usedIds[newId] = true;

    warnings.push(
      'Duplicate propellant id detected for "' +
      baseId +
      '", assigned "' +
      newId +
      '"'
    );
  }

  return { propellants: propellantsList, warnings: warnings };
}
/* End Parse BurnSim Formulas - extraction */

/* Begin Parse BurnSim Formulas - table rendering */
function buildHeaderKeyMap() {
  return {
    Name: 'name',
    ISPStar: 'isp_star',
    A: 'burn_rate_a',
    N: 'burn_rate_n',
    Density: 'density',
    SpecificHeatRatio: 'specific_heat_ratio'
  };
}

function setTableHeaderSortable(tableElement) {
  if (!tableElement) return;

  const headerCells = tableElement.querySelectorAll('thead th');
  const headerKeyMap = buildHeaderKeyMap();

  headerCells.forEach(function attachSortHandler(headerCell) {
    const headerText = safeTrim(headerCell.textContent || '');
    const sortKey = headerKeyMap[headerText];
    if (!sortKey) return;

    headerCell.style.cursor = 'pointer';
    headerCell.addEventListener('click', function onHeaderClick() {
      toggleSort(sortKey);
      renderPropellantsTable();
    });
  });
}

function toggleSort(sortKey) {
  if (BurnsimState.sort.key !== sortKey) {
    BurnsimState.sort.key = sortKey;
    BurnsimState.sort.direction = 'asc';
    return;
  }

  BurnsimState.sort.direction =
    BurnsimState.sort.direction === 'asc' ? 'desc' : 'asc';
}

function getSortedPropellants() {
  const propellantsCopy = BurnsimState.propellants.slice();
  const sortKey = BurnsimState.sort.key;

  if (!sortKey) return propellantsCopy;

  const direction = BurnsimState.sort.direction;
  const multiplier = direction === 'asc' ? 1 : -1;

  propellantsCopy.sort(function sortRecords(leftRecord, rightRecord) {
    const leftValue = leftRecord[sortKey];
    const rightValue = rightRecord[sortKey];

    if (typeof leftValue === 'string' && typeof rightValue === 'string') {
      return leftValue.localeCompare(rightValue) * multiplier;
    }

    if (isFiniteNumber(leftValue) && isFiniteNumber(rightValue)) {
      return (leftValue - rightValue) * multiplier;
    }

    return 0;
  });

  return propellantsCopy;
}

function renderPropellantsTable() {
  const tableElement = getElementByIdStrict(BurnsimUiIds.tableId);
  const tableBodyElement = getElementByIdStrict(BurnsimUiIds.tableBodyId);
  if (!tableElement || !tableBodyElement) return;

  clearTableBody(tableBodyElement);

  const propellantsToRender = getSortedPropellants();
  for (let i = 0; i < propellantsToRender.length; i += 1) {
    const propellant = propellantsToRender[i];
    const rowElement = document.createElement('tr');

    rowElement.style.cursor = 'pointer';
    rowElement.addEventListener('click', function onRowClick() {
      const targetId = propellant.propellant_id;
      const targetUrl =
        'formula.html?propellant_id=' + encodeURIComponent(targetId);

      window.location.href = targetUrl;
    });

    const cells = [
      propellant.display.Name,
      propellant.display.ISPStar,
      propellant.display.A,
      propellant.display.N,
      propellant.display.Density,
      propellant.display.SpecificHeatRatio
    ];

    for (let columnIndex = 0; columnIndex < cells.length; columnIndex += 1) {
      const cellElement = document.createElement('td');
      cellElement.textContent = cells[columnIndex];

      if (columnIndex > 0) cellElement.classList.add('text-end');
      rowElement.appendChild(cellElement);
    }

    tableBodyElement.appendChild(rowElement);
  }

  showTable(tableElement);
}
/* End Parse BurnSim Formulas - table rendering */

/* Begin Parse BurnSim Formulas - main parse routine */
function parseBurnsimTextToWrapper(sourceText, sourceType, originalFilename) {
  const wrapper = buildWrapper(sourceType, originalFilename);

  const parsedDocResult = parsePropellantsForgiving(sourceText);
  if (!parsedDocResult.ok) {
    wrapper.parse.status = 'error';
    wrapper.parse.errors.push('Unable to parse XML/HTML content.');
    return wrapper;
  }

  const propellantNodes = getPropellantNodes(parsedDocResult.doc);
  if (!propellantNodes || propellantNodes.length === 0) {
    wrapper.parse.status = 'error';
    wrapper.parse.errors.push('No <Propellant> nodes were found.');
    return wrapper;
  }

  const propellants = [];
  const errors = [];
  const warnings = [];

  for (let i = 0; i < propellantNodes.length; i += 1) {
    const extracted = extractPropellantFromNode(propellantNodes[i]);
    const normalized = validateAndNormalizePropellant(extracted, i + 1);

    if (!normalized.ok) {
      errors.push.apply(errors, normalized.errors);
      continue;
    }

    propellants.push(normalized.record);
  }

  if (errors.length > 0) {
    wrapper.parse.status = 'error';
    wrapper.parse.errors = errors;
    return wrapper;
  }

  const dupeResult = applyDuplicateIdPolicy(propellants, warnings);
  const dedupedPropellants = dupeResult.propellants;
  const dedupeWarnings = dupeResult.warnings;

  for (let i = 0; i < dedupedPropellants.length; i += 1) {
    validateRangeWarnings(dedupedPropellants[i], dedupeWarnings);
  }

  wrapper.propellants = dedupedPropellants.map(function toStoredRecord(p) {
    return {
      propellant_id: p.propellant_id,
      name: p.name,
      isp_star: p.isp_star,
      burn_rate_a: p.burn_rate_a,
      burn_rate_n: p.burn_rate_n,
      density: p.density,
      specific_heat_ratio: p.specific_heat_ratio,
      notes: p.notes
    };
  });

  wrapper.parse.warnings = dedupeWarnings;
  wrapper.parse.errors = [];
  wrapper.parse.status = dedupeWarnings.length > 0 ? 'warning' : 'ok';

  return wrapper;
}
/* End Parse BurnSim Formulas - main parse routine */

/* Begin Parse BurnSim Formulas - clear routine */
function clearBurnsimUi() {
  const rawInput = getElementByIdStrict(BurnsimUiIds.rawInputId);
  const fileInput = getElementByIdStrict(BurnsimUiIds.fileInputId);
  const chosenFileName = getElementByIdStrict(BurnsimUiIds.chosenFileNameId);
  const banner = getElementByIdStrict(BurnsimUiIds.statusBannerId);
  const tableElement = getElementByIdStrict(BurnsimUiIds.tableId);
  const tableBodyElement = getElementByIdStrict(BurnsimUiIds.tableBodyId);

  if (rawInput) rawInput.value = '';
  if (fileInput) fileInput.value = '';

  if (chosenFileName) chosenFileName.value = 'No file selected';

  setBannerHidden(banner);
  hideTable(tableElement);
  clearTableBody(tableBodyElement);

  BurnsimState.parsedWrapper = null;
  BurnsimState.propellants = [];
  BurnsimState.sort.key = null;
  BurnsimState.sort.direction = 'asc';
}
/* End Parse BurnSim Formulas - clear routine */

/* Begin Parse BurnSim Formulas - UI wiring */
function wireChooseFileButton() {
  const chooseFileButton = getElementByIdStrict(
    BurnsimUiIds.chooseFileButtonId
  );
  const fileInput = getElementByIdStrict(BurnsimUiIds.fileInputId);

  if (!chooseFileButton || !fileInput) return;

  chooseFileButton.addEventListener('click', function onChooseFileClick() {
    fileInput.click();
  });
}

function wireFileInputChange() {
  const fileInput = getElementByIdStrict(BurnsimUiIds.fileInputId);
  const chosenFileName = getElementByIdStrict(BurnsimUiIds.chosenFileNameId);
  const rawInput = getElementByIdStrict(BurnsimUiIds.rawInputId);

  if (!fileInput || !chosenFileName || !rawInput) return;

  fileInput.addEventListener('change', function onFileChange() {
    const selectedFile =
      fileInput.files && fileInput.files.length > 0 ? fileInput.files[0] : null;

    if (!selectedFile) {
      chosenFileName.value = 'No file selected';
      return;
    }

    chosenFileName.value = selectedFile.name;

    const reader = new FileReader();
    reader.onload = function onReaderLoad(event) {
      const text = event && event.target ? event.target.result : '';
      rawInput.value = typeof text === 'string' ? text : String(text);
    };

    reader.onerror = function onReaderError() {
      chosenFileName.value = selectedFile.name + ' (read error)';
    };

    reader.readAsText(selectedFile);
  });
}

function wireParseButton() {
  const parseButton = getElementByIdStrict(BurnsimUiIds.parseButtonId);
  const rawInput = getElementByIdStrict(BurnsimUiIds.rawInputId);
  const banner = getElementByIdStrict(BurnsimUiIds.statusBannerId);
  const tableElement = getElementByIdStrict(BurnsimUiIds.tableId);
  const fileInput = getElementByIdStrict(BurnsimUiIds.fileInputId);

  if (!parseButton || !rawInput || !banner || !tableElement) return;

  parseButton.addEventListener('click', function onParseClick() {
    setBannerHidden(banner);
    hideTable(tableElement);

    const rawText = safeTrim(rawInput.value || '');
    const selectedFile =
      fileInput && fileInput.files && fileInput.files.length > 0 ?
        fileInput.files[0] :
        null;

    const sourceType = selectedFile ? 'file' : 'paste';
    const originalFilename = selectedFile ? selectedFile.name : '';

    if (!rawText) {
      setBannerError(banner, 'No input provided. Paste text or choose a file.');
      BurnsimState.propellants = [];
      BurnsimState.parsedWrapper = null;
      return;
    }

    const wrapper = parseBurnsimTextToWrapper(
      rawText,
      sourceType,
      originalFilename
    );

    BurnsimState.parsedWrapper = wrapper;
    BurnsimState.sort.key = null;
    BurnsimState.sort.direction = 'asc';

    if (wrapper.parse.status === 'error') {
      setBannerError(banner, wrapper.parse.errors.join('  '));
      BurnsimState.propellants = [];
      return;
    }

    BurnsimState.propellants = wrapper.propellants.map(function toUiRecord(p) {
      return {
        propellant_id: p.propellant_id,
        name: p.name,
        isp_star: p.isp_star,
        burn_rate_a: p.burn_rate_a,
        burn_rate_n: p.burn_rate_n,
        density: p.density,
        specific_heat_ratio: p.specific_heat_ratio,
        notes: p.notes,
        display: {
          Name: p.name,
          ISPStar: displayAsGiven(String(p.isp_star)),
          A: displayAsGiven(String(p.burn_rate_a)),
          N: displayAsGiven(String(p.burn_rate_n)),
          Density: displayAsGiven(String(p.density)),
          SpecificHeatRatio: roundToDecimals(p.specific_heat_ratio, 8)
        }
      };
    });

    if (wrapper.parse.status === 'warning') {
      setBannerWarning(banner, wrapper.parse.warnings.join('  '));
    } else {
      setBannerSuccess(
        banner,
        'Parsed ' + String(wrapper.propellants.length) + ' propellants.'
      );
    }

    renderPropellantsTable();
  });
}

function wireClearButton() {
  const clearButton = getElementByIdStrict(BurnsimUiIds.clearButtonId);
  if (!clearButton) return;

  clearButton.addEventListener('click', function onClearClick() {
    clearBurnsimUi();
  });
}

function wireFormSubmitBlocker() {
  const formElement = getElementByIdStrict(BurnsimUiIds.formId);
  if (!formElement) return;

  formElement.addEventListener('submit', function onFormSubmit(event) {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }
  });
}

function initBurnsimParserUi() {
  wireFormSubmitBlocker();
  wireChooseFileButton();
  wireFileInputChange();
  wireParseButton();
  wireClearButton();

  const tableElement = getElementByIdStrict(BurnsimUiIds.tableId);
  setTableHeaderSortable(tableElement);
}
/* End Parse BurnSim Formulas - UI wiring */

/* Begin Parse BurnSim Formulas - init */
document.addEventListener('DOMContentLoaded', function onDomReady() {
  initBurnsimParserUi();
});
/* End Parse BurnSim Formulas - init */
