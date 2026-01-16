// parse-bs-motor.js

/* Begin BurnSim Motors - constants */
const BurnsimMotorUiIds = {
  formId: 'burnsimMotorParseForm',
  motorNameInputId: 'burnsimMotorNameInput',
  rawInputId: 'burnsimMotorRawInput',
  fileInputId: 'burnsimMotorFileInput',
  chooseFileButtonId: 'burnsimMotorChooseFileButton',
  chosenFileNameId: 'burnsimMotorChosenFileName',
  parseButtonId: 'burnsimMotorParseButton',
  clearButtonId: 'burnsimMotorClearButton',
  statusBannerId: 'burnsimMotorParseStatus',
  summaryTableId: 'burnsimMotorSummaryTable',
  summaryTableBodyId: 'burnsimMotorSummaryTableBody',
  grainsTableId: 'burnsimMotorGrainsTable',
  grainsTableBodyId: 'burnsimMotorGrainsTableBody'
};

const BurnsimMotorSchema = {
  schema: 'burnsim-motor-json',
  schemaVersion: '1.0'
};

const BurnsimMotorGrainTypeLabels = {
  '1': 'Bates'
};
/* End BurnSim Motors - constants */

/* Begin BurnSim Motors - DOM helpers */
function burnsimMotorGetElementByIdStrict(elementId) {
  const element = document.getElementById(elementId);
  return element || null;
}

function burnsimMotorSetBannerHidden(bannerElement) {
  if (!bannerElement) return;

  bannerElement.classList.add('d-none');
  bannerElement.classList.remove('alert-success');
  bannerElement.classList.remove('alert-warning');
  bannerElement.classList.remove('alert-danger');
  bannerElement.textContent = '';
}

function burnsimMotorSetBannerSuccess(bannerElement, messageText) {
  if (!bannerElement) return;

  bannerElement.classList.remove('d-none');
  bannerElement.classList.remove('alert-warning');
  bannerElement.classList.remove('alert-danger');
  bannerElement.classList.add('alert-success');
  bannerElement.textContent = messageText;
}

function burnsimMotorSetBannerWarning(bannerElement, messageText) {
  if (!bannerElement) return;

  bannerElement.classList.remove('d-none');
  bannerElement.classList.remove('alert-success');
  bannerElement.classList.remove('alert-danger');
  bannerElement.classList.add('alert-warning');
  bannerElement.textContent = messageText;
}

function burnsimMotorSetBannerError(bannerElement, messageText) {
  if (!bannerElement) return;

  bannerElement.classList.remove('d-none');
  bannerElement.classList.remove('alert-success');
  bannerElement.classList.remove('alert-warning');
  bannerElement.classList.add('alert-danger');
  bannerElement.textContent = messageText;
}

function burnsimMotorShowTable(tableElement) {
  if (!tableElement) return;
  tableElement.classList.remove('d-none');
}

function burnsimMotorHideTable(tableElement) {
  if (!tableElement) return;
  tableElement.classList.add('d-none');
}

function burnsimMotorClearTableBody(tableBodyElement) {
  if (!tableBodyElement) return;
  tableBodyElement.innerHTML = '';
}
/* End BurnSim Motors - DOM helpers */

/* Begin BurnSim Motors - parsing helpers */
function burnsimMotorSafeTrim(inputValue) {
  if (typeof inputValue !== 'string') return '';
  return inputValue.trim();
}

function burnsimMotorParseXmlDocument(sourceText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(sourceText, 'text/xml');
  const parseError = doc.getElementsByTagName('parsererror');

  if (parseError && parseError.length > 0) return { ok: false, doc: null };
  return { ok: true, doc: doc };
}

function burnsimMotorParseXmlForgiving(sourceText) {
  const firstAttempt = burnsimMotorParseXmlDocument(sourceText);
  if (firstAttempt.ok) return { ok: true, doc: firstAttempt.doc };

  const wrappedText = '<Root>' + sourceText + '</Root>';
  const secondAttempt = burnsimMotorParseXmlDocument(wrappedText);
  if (secondAttempt.ok) return { ok: true, doc: secondAttempt.doc };

  return { ok: false, doc: null };
}

function burnsimMotorSanitizeToId(rawName) {
  const trimmedName = burnsimMotorSafeTrim(rawName);
  const lowerName = trimmedName.toLowerCase();
  const withUnderscores = lowerName.replace(/\s+/g, '_');
  const onlySafeChars = withUnderscores.replace(/[^a-z0-9_]/g, '_');
  const collapsed = onlySafeChars.replace(/_+/g, '_');
  const stripped = collapsed.replace(/^_+|_+$/g, '');

  return stripped || 'unknown';
}

function burnsimMotorApplyDupeSuffix(baseId, dupeIndex) {
  const indexNumber = typeof dupeIndex === 'number' ? dupeIndex : 2;
  return baseId + '_dupe' + String(indexNumber);
}

function burnsimMotorBaseFilename(originalFilename) {
  const filenameText = burnsimMotorSafeTrim(originalFilename || '');
  if (!filenameText) return '';

  const lastSlashIndex = Math.max(filenameText.lastIndexOf('/'), filenameText.lastIndexOf('\\'));
  const shortName = lastSlashIndex >= 0 ? filenameText.slice(lastSlashIndex + 1) : filenameText;

  const lastDotIndex = shortName.lastIndexOf('.');
  if (lastDotIndex <= 0) return shortName;

  return shortName.slice(0, lastDotIndex);
}

function burnsimMotorLabelGrainType(rawTypeValue) {
  const normalizedTypeText = burnsimMotorSafeTrim(rawTypeValue || '');
  if (!normalizedTypeText) return '';
  return BurnsimMotorGrainTypeLabels[normalizedTypeText] || normalizedTypeText;
}
/* End BurnSim Motors - parsing helpers */

/* Begin BurnSim Motors - wrapper */
function burnsimMotorBuildWrapper(sourceType, originalFilename) {
  const utcNow = new Date().toISOString();

  return {
    schema: BurnsimMotorSchema.schema,
    schema_version: BurnsimMotorSchema.schemaVersion,
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
    motor: null
  };
}
/* End BurnSim Motors - wrapper */

/* Begin BurnSim Motors - extractors */
function burnsimMotorGetFirstNodeByTag(xmlDoc, tagName) {
  if (!xmlDoc) return null;
  const nodes = xmlDoc.getElementsByTagName(tagName);
  return nodes && nodes.length > 0 ? nodes[0] : null;
}

function burnsimMotorExtractNozzle(motorNode) {
  const nozzleNodes = motorNode.getElementsByTagName('Nozzle');
  if (!nozzleNodes || nozzleNodes.length === 0) return null;

  const nozzleNode = nozzleNodes[0];
  return {
    throat_dia: nozzleNode.getAttribute('ThroatDia'),
    exit_dia: nozzleNode.getAttribute('ExitDia'),
    ambient_pressure: nozzleNode.getAttribute('AmbientPressure'),
    nozzle_efficiency: nozzleNode.getAttribute('NozzleEfficiency')
  };
}

function burnsimMotorExtractPropellant(grainNode) {
  const propellantNodes = grainNode.getElementsByTagName('Propellant');
  if (!propellantNodes || propellantNodes.length === 0) return null;

  const propellantNode = propellantNodes[0];
  const notesNodes = propellantNode.getElementsByTagName('Notes');
  const notesText = notesNodes && notesNodes.length > 0 ? burnsimMotorSafeTrim(notesNodes[0].textContent || '') : '';

  return {
    name: propellantNode.getAttribute('Name'),
    density: propellantNode.getAttribute('Density'),
    isp_star: propellantNode.getAttribute('ISPStar'),
    ballistic_a: propellantNode.getAttribute('BallisticA'),
    ballistic_n: propellantNode.getAttribute('BallisticN'),
    specific_heat_ratio: propellantNode.getAttribute('SpecificHeatRatio'),
    molar_mass: propellantNode.getAttribute('MolarMass'),
    combustion_temp: propellantNode.getAttribute('CombustionTemp'),
    notes: notesText
  };
}

function burnsimMotorExtractGrains(motorNode) {
  const grainNodes = motorNode.getElementsByTagName('Grain');
  if (!grainNodes || grainNodes.length === 0) return [];

  const grains = [];
  const grainNodeList = Array.from(grainNodes);

  for (let grainIndex = 0; grainIndex < grainNodeList.length; grainIndex += 1) {
    const grainNode = grainNodeList[grainIndex];
    const embeddedPropellant = burnsimMotorExtractPropellant(grainNode);

    grains.push({
      index: grainIndex + 1,
      type: grainNode.getAttribute('Type'),
      type_label: burnsimMotorLabelGrainType(grainNode.getAttribute('Type')),
      length: grainNode.getAttribute('Length'),
      diameter: grainNode.getAttribute('Diameter'),
      ends_inhibited: grainNode.getAttribute('EndsInhibited'),
      propellant_ref: grainNode.getAttribute('Propellant'),
      core_diameter: grainNode.getAttribute('CoreDiameter'),
      propellant: embeddedPropellant
    });
  }

  return grains;
}

function burnsimMotorExtractMotorNotes(motorNode) {
  const notesNodes = motorNode.getElementsByTagName('MotorNotes');
  if (!notesNodes || notesNodes.length === 0) return '';

  return burnsimMotorSafeTrim(notesNodes[0].textContent || '');
}
/* End BurnSim Motors - extractors */

/* Begin BurnSim Motors - normalize and validate */
function burnsimMotorNormalizeMotorName(motorNameRaw, sourceType, originalFilename, warningsList) {
  const warnings = Array.isArray(warningsList) ? warningsList : [];
  const motorName = burnsimMotorSafeTrim(motorNameRaw);

  if (motorName) return motorName;

  if (sourceType === 'file') {
    const derivedFromFilename = burnsimMotorBaseFilename(originalFilename);
    if (derivedFromFilename) {
      warnings.push('Motor Name was empty in file; using uploaded filename as name. You should set a proper motor name.');
      return derivedFromFilename;
    }
  }

  warnings.push('Motor Name was empty; using fallback derived name. You should set a proper motor name.');
  return '';
}

function burnsimMotorBuildFallbackName(motorHeader) {
  const mfgCode = burnsimMotorSafeTrim(motorHeader.mfg_code || '').toLowerCase() || 'motor';
  const diameterText = burnsimMotorSafeTrim(motorHeader.diameter_mm || '0');
  const lengthText = burnsimMotorSafeTrim(motorHeader.length || '0');

  return mfgCode + '_' + diameterText + 'mm_' + lengthText;
}

function burnsimMotorDedupMotorId(baseId, usedIds) {
  if (!Object.prototype.hasOwnProperty.call(usedIds, baseId)) {
    usedIds[baseId] = 1;
    return baseId;
  }

  usedIds[baseId] = usedIds[baseId] + 1;
  const dupeIndex = usedIds[baseId];
  const newId = burnsimMotorApplyDupeSuffix(baseId, dupeIndex);
  usedIds[newId] = 1;

  return newId;
}

function burnsimMotorBuildMotorObject(motorNode, sourceType, originalFilename) {
  const warnings = [];
  const errors = [];

  const motorHeader = {
    name: motorNode.getAttribute('Name'),
    diameter_mm: motorNode.getAttribute('DiameterMM'),
    length: motorNode.getAttribute('Length'),
    delays: motorNode.getAttribute('Delays'),
    hardware_weight: motorNode.getAttribute('HardwareWeight'),
    mfg_code: motorNode.getAttribute('MFGCode'),
    thrust_method: motorNode.getAttribute('ThrustMethod'),
    thrust_coef_given: motorNode.getAttribute('ThrustCoefGiven'),
    units_linear: motorNode.getAttribute('UnitsLinear')
  };

  let finalMotorName = burnsimMotorNormalizeMotorName(motorHeader.name, sourceType, originalFilename, warnings);
  if (!finalMotorName) finalMotorName = burnsimMotorBuildFallbackName(motorHeader);

  const motorIdBase = burnsimMotorSanitizeToId(finalMotorName);
  const motorId = burnsimMotorDedupMotorId(motorIdBase, {});

  const nozzle = burnsimMotorExtractNozzle(motorNode);
  const grains = burnsimMotorExtractGrains(motorNode);

  if (!grains || grains.length === 0) errors.push('No <Grain> nodes were found in this Motor.');

  const motorNotes = burnsimMotorExtractMotorNotes(motorNode);

  const motorObject = {
    motor_id: motorId,
    name: finalMotorName,
    header: motorHeader,
    nozzle: nozzle,
    grains: grains,
    motor_notes: motorNotes
  };

  return { ok: errors.length === 0, motor: motorObject, warnings: warnings, errors: errors };
}
/* End BurnSim Motors - normalize and validate */

/* Begin BurnSim Motors - main parse */
function parseBurnsimMotorTextToWrapper(sourceText, sourceType, originalFilename) {
  const wrapper = burnsimMotorBuildWrapper(sourceType, originalFilename);

  const parsedDocResult = burnsimMotorParseXmlForgiving(sourceText);
  if (!parsedDocResult.ok) {
    wrapper.parse.status = 'error';
    wrapper.parse.errors.push('Unable to parse XML/HTML content.');
    return wrapper;
  }

  const motorNode = burnsimMotorGetFirstNodeByTag(parsedDocResult.doc, 'Motor');
  if (!motorNode) {
    wrapper.parse.status = 'error';
    wrapper.parse.errors.push('No <Motor> root node was found.');
    return wrapper;
  }

  const built = burnsimMotorBuildMotorObject(motorNode, sourceType, originalFilename);
  if (!built.ok) {
    wrapper.parse.status = 'error';
    wrapper.parse.errors = built.errors;
    wrapper.parse.warnings = built.warnings;
    return wrapper;
  }

  wrapper.motor = built.motor;
  wrapper.parse.errors = [];
  wrapper.parse.warnings = built.warnings;
  wrapper.parse.status = built.warnings.length > 0 ? 'warning' : 'ok';

  return wrapper;
}
/* End BurnSim Motors - main parse */

/* Begin BurnSim Motors - rendering */
function burnsimMotorRenderSummary(wrapper) {
  const tableElement = burnsimMotorGetElementByIdStrict(BurnsimMotorUiIds.summaryTableId);
  const tableBodyElement = burnsimMotorGetElementByIdStrict(BurnsimMotorUiIds.summaryTableBodyId);
  if (!tableElement || !tableBodyElement) return;

  burnsimMotorClearTableBody(tableBodyElement);

  const motor = wrapper && wrapper.motor ? wrapper.motor : null;
  if (!motor) return;

  const header = motor.header || {};
  const nozzle = motor.nozzle || {};

  const rowElement = document.createElement('tr');

  const cellValues = [
    motor.name || '',
    header.diameter_mm || '',
    header.length || '',
    header.mfg_code || '',
    header.hardware_weight || '',
    header.delays || '',
    nozzle.throat_dia || '',
    nozzle.exit_dia || '',
    nozzle.nozzle_efficiency || ''
  ];

  for (let valueIndex = 0; valueIndex < cellValues.length; valueIndex += 1) {
    const cellElement = document.createElement('td');
    cellElement.textContent = cellValues[valueIndex];

    if (valueIndex !== 0 && valueIndex !== 3) cellElement.classList.add('text-end');
    rowElement.appendChild(cellElement);
  }

  tableBodyElement.appendChild(rowElement);
  burnsimMotorShowTable(tableElement);
}

function burnsimMotorRenderGrains(wrapper) {
  const tableElement = burnsimMotorGetElementByIdStrict(BurnsimMotorUiIds.grainsTableId);
  const tableBodyElement = burnsimMotorGetElementByIdStrict(BurnsimMotorUiIds.grainsTableBodyId);
  if (!tableElement || !tableBodyElement) return;

  burnsimMotorClearTableBody(tableBodyElement);

  const grains = wrapper && wrapper.motor && wrapper.motor.grains ? wrapper.motor.grains : [];
  if (!grains || grains.length === 0) return;

  for (let grainIndex = 0; grainIndex < grains.length; grainIndex += 1) {
    const grain = grains[grainIndex];
    const propellant = grain.propellant || {};

    const rowElement = document.createElement('tr');

    const cellValues = [
      String(grain.index || grainIndex + 1),
      grain.type_label || grain.type || '',
      grain.length || '',
      grain.diameter || '',
      grain.core_diameter || '',
      grain.ends_inhibited || '',
      propellant.name || grain.propellant_ref || '',
      propellant.density || '',
      propellant.isp_star || '',
      propellant.ballistic_a || '',
      propellant.ballistic_n || '',
      propellant.specific_heat_ratio || ''
    ];

    for (let columnIndex = 0; columnIndex < cellValues.length; columnIndex += 1) {
      const cellElement = document.createElement('td');
      cellElement.textContent = cellValues[columnIndex];

      if (columnIndex > 0 && columnIndex !== 6) cellElement.classList.add('text-end');
      rowElement.appendChild(cellElement);
    }

    tableBodyElement.appendChild(rowElement);
  }

  burnsimMotorShowTable(tableElement);
}
/* End BurnSim Motors - rendering */

/* Begin BurnSim Motors - clear routine */
function burnsimMotorClearUi() {
  const motorNameInput = burnsimMotorGetElementByIdStrict(BurnsimMotorUiIds.motorNameInputId);
  const rawInput = burnsimMotorGetElementByIdStrict(BurnsimMotorUiIds.rawInputId);
  const fileInput = burnsimMotorGetElementByIdStrict(BurnsimMotorUiIds.fileInputId);
  const chosenFileName = burnsimMotorGetElementByIdStrict(BurnsimMotorUiIds.chosenFileNameId);
  const banner = burnsimMotorGetElementByIdStrict(BurnsimMotorUiIds.statusBannerId);

  const summaryTableElement = burnsimMotorGetElementByIdStrict(BurnsimMotorUiIds.summaryTableId);
  const summaryTableBody = burnsimMotorGetElementByIdStrict(BurnsimMotorUiIds.summaryTableBodyId);
  const grainsTableElement = burnsimMotorGetElementByIdStrict(BurnsimMotorUiIds.grainsTableId);
  const grainsTableBody = burnsimMotorGetElementByIdStrict(BurnsimMotorUiIds.grainsTableBodyId);

  if (motorNameInput) motorNameInput.value = '';
  if (rawInput) rawInput.value = '';
  if (fileInput) fileInput.value = '';
  if (chosenFileName) chosenFileName.value = 'No file selected';

  burnsimMotorSetBannerHidden(banner);

  burnsimMotorHideTable(summaryTableElement);
  burnsimMotorHideTable(grainsTableElement);
  burnsimMotorClearTableBody(summaryTableBody);
  burnsimMotorClearTableBody(grainsTableBody);
}
/* End BurnSim Motors - clear routine */

/* Begin BurnSim Motors - UI wiring */
function burnsimMotorWireFormSubmitBlocker() {
  const formElement = burnsimMotorGetElementByIdStrict(BurnsimMotorUiIds.formId);
  if (!formElement) return;

  formElement.addEventListener('submit', function onFormSubmit(event) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
  });
}

function burnsimMotorWireChooseFileButton() {
  const chooseFileButton = burnsimMotorGetElementByIdStrict(BurnsimMotorUiIds.chooseFileButtonId);
  const fileInput = burnsimMotorGetElementByIdStrict(BurnsimMotorUiIds.fileInputId);
  if (!chooseFileButton || !fileInput) return;

  chooseFileButton.addEventListener('click', function onChooseFileClick() {
    fileInput.click();
  });
}

function burnsimMotorWireFileInputChange() {
  const fileInput = burnsimMotorGetElementByIdStrict(BurnsimMotorUiIds.fileInputId);
  const chosenFileName = burnsimMotorGetElementByIdStrict(BurnsimMotorUiIds.chosenFileNameId);
  const rawInput = burnsimMotorGetElementByIdStrict(BurnsimMotorUiIds.rawInputId);
  if (!fileInput || !chosenFileName || !rawInput) return;

  fileInput.addEventListener('change', function onFileChange() {
    const selectedFile = fileInput.files && fileInput.files.length > 0 ? fileInput.files[0] : null;

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

function burnsimMotorWireParseButton() {
  const parseButton = burnsimMotorGetElementByIdStrict(BurnsimMotorUiIds.parseButtonId);
  const rawInput = burnsimMotorGetElementByIdStrict(BurnsimMotorUiIds.rawInputId);
  const fileInput = burnsimMotorGetElementByIdStrict(BurnsimMotorUiIds.fileInputId);
  const banner = burnsimMotorGetElementByIdStrict(BurnsimMotorUiIds.statusBannerId);

  const motorNameInput = burnsimMotorGetElementByIdStrict(BurnsimMotorUiIds.motorNameInputId);
  const summaryTableElement = burnsimMotorGetElementByIdStrict(BurnsimMotorUiIds.summaryTableId);
  const grainsTableElement = burnsimMotorGetElementByIdStrict(BurnsimMotorUiIds.grainsTableId);

  if (!parseButton || !rawInput || !banner) return;

  parseButton.addEventListener('click', function onParseClick() {
    burnsimMotorSetBannerHidden(banner);
    burnsimMotorHideTable(summaryTableElement);
    burnsimMotorHideTable(grainsTableElement);

    const rawText = burnsimMotorSafeTrim(rawInput.value || '');
    const selectedFile = fileInput && fileInput.files && fileInput.files.length > 0 ? fileInput.files[0] : null;

    const sourceType = selectedFile ? 'file' : 'paste';
    const originalFilename = selectedFile ? selectedFile.name : '';

    if (!rawText) {
      burnsimMotorSetBannerError(banner, 'No input provided. Paste text or choose a file.');
      return;
    }

    const wrapper = parseBurnsimMotorTextToWrapper(rawText, sourceType, originalFilename);
    if (wrapper.parse.status === 'error') {
      burnsimMotorSetBannerError(banner, wrapper.parse.errors.join('  '));
      return;
    }

    const userOverrideName = motorNameInput ? burnsimMotorSafeTrim(motorNameInput.value || '') : '';
    if (userOverrideName && wrapper.motor) {
      wrapper.motor.name = userOverrideName;
      wrapper.motor.motor_id = burnsimMotorSanitizeToId(userOverrideName);
      wrapper.motor.header.name = userOverrideName;
      wrapper.parse.warnings.push('Motor Name overridden by user input. You should verify this name is correct.');
      wrapper.parse.status = 'warning';
    }

    if (motorNameInput && wrapper.motor && wrapper.motor.name) motorNameInput.value = wrapper.motor.name;

    if (wrapper.parse.status === 'warning') {
      burnsimMotorSetBannerWarning(banner, wrapper.parse.warnings.join('  '));
    } else {
      burnsimMotorSetBannerSuccess(banner, 'Parsed motor and ' + String(wrapper.motor.grains.length) + ' grains.');
    }

    burnsimMotorRenderSummary(wrapper);
    burnsimMotorRenderGrains(wrapper);
  });
}

function burnsimMotorWireClearButton() {
  const clearButton = burnsimMotorGetElementByIdStrict(BurnsimMotorUiIds.clearButtonId);
  if (!clearButton) return;

  clearButton.addEventListener('click', function onClearClick() {
    burnsimMotorClearUi();
  });
}

function burnsimMotorInitUi() {
  burnsimMotorWireFormSubmitBlocker();
  burnsimMotorWireChooseFileButton();
  burnsimMotorWireFileInputChange();
  burnsimMotorWireParseButton();
  burnsimMotorWireClearButton();
}
/* End BurnSim Motors - UI wiring */

/* Begin BurnSim Motors - init */
document.addEventListener('DOMContentLoaded', function onDomReady() {
  burnsimMotorInitUi();
});
/* End BurnSim Motors - init */
