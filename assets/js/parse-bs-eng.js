// parse-bs-eng.js

/* Begin BurnSim ENG - constants */
const BurnsimEngUiIds = {
  formId: 'burnsimEngParseForm',
  engNameInputId: 'burnsimEngNameInput',
  rawInputId: 'burnsimEngRawInput',
  fileInputId: 'burnsimEngFileInput',
  chooseFileButtonId: 'burnsimEngChooseFileButton',
  chosenFileNameId: 'burnsimEngChosenFileName',
  parseButtonId: 'burnsimEngParseButton',
  clearButtonId: 'burnsimEngClearButton',
  statusBannerId: 'burnsimEngParseStatus',
  curveTableId: 'burnsimEngCurveTable',
  curveTableBodyId: 'burnsimEngCurveTableBody',
  graphCardId: 'burnsimEngGraphCard',
  graphSubtitleId: 'burnsimEngGraphSubtitle',
  thrustChartCanvasId: 'burnsimEngThrustChart',
  deltaBarCanvasId: 'burnsimEngDeltaBarChart',
  resultsCardId: 'burnsimEngResultsCard',
  classTextId: 'burnsimEngClassText',
  classRingCanvasId: 'burnsimEngClassRingChart',
  totalImpulseCellId: 'burnsimEngTotalImpulseCell',
  burnTimeCellId: 'burnsimEngBurnTimeCell',
  avgThrustCellId: 'burnsimEngAvgThrustCell',
  maxThrustCellId: 'burnsimEngMaxThrustCell',
  pointCountCellId: 'burnsimEngPointCountCell'
};

const BurnsimEngSchema = {
  schema: 'burnsim-eng-json',
  schemaVersion: '1.0'
};

const BurnsimEngMotorClasses = [
  { classLetter: 'A', minNs: 1.26, maxNs: 2.50 },
  { classLetter: 'B', minNs: 2.51, maxNs: 5.00 },
  { classLetter: 'C', minNs: 5.01, maxNs: 10.00 },
  { classLetter: 'D', minNs: 10.01, maxNs: 20.00 },
  { classLetter: 'E', minNs: 20.01, maxNs: 40.00 },
  { classLetter: 'F', minNs: 40.01, maxNs: 80.00 },
  { classLetter: 'G', minNs: 80.01, maxNs: 160.00 },
  { classLetter: 'H', minNs: 160.01, maxNs: 320.00 },
  { classLetter: 'I', minNs: 320.01, maxNs: 640.00 },
  { classLetter: 'J', minNs: 640.01, maxNs: 1280.00 },
  { classLetter: 'K', minNs: 1280.01, maxNs: 2560.00 },
  { classLetter: 'L', minNs: 2560.01, maxNs: 5120.00 },
  { classLetter: 'M', minNs: 5120.01, maxNs: 10240.00 },
  { classLetter: 'N', minNs: 10240.01, maxNs: 20480.00 },
  { classLetter: 'O', minNs: 20480.01, maxNs: 40960.00 },
  { classLetter: 'P', minNs: 40960.01, maxNs: 81920.00 },
  { classLetter: 'Q', minNs: 81920.01, maxNs: 163840.00 },
  { classLetter: 'R', minNs: 163840.01, maxNs: 327680.00 },
  { classLetter: 'S', minNs: 327680.01, maxNs: 655360.00 }
];

const BurnsimEngUnits = {
  timeSeconds: 's',
  thrustNewtons: 'N',
  thrustPoundsForce: 'lbf',
  impulseNewtonSeconds: 'N·s'
};
/* End BurnSim ENG - constants */

/* Begin BurnSim ENG - DOM helpers */
function burnsimEngGetElementByIdStrict(elementId) {
  const element = document.getElementById(elementId);
  return element || null;
}

function burnsimEngSetBannerHidden(bannerElement) {
  if (!bannerElement) return;

  bannerElement.classList.add('d-none');
  bannerElement.classList.remove('alert-success');
  bannerElement.classList.remove('alert-warning');
  bannerElement.classList.remove('alert-danger');
  bannerElement.textContent = '';
}

function burnsimEngSetBannerSuccess(bannerElement, messageText) {
  if (!bannerElement) return;

  bannerElement.classList.remove('d-none');
  bannerElement.classList.remove('alert-warning');
  bannerElement.classList.remove('alert-danger');
  bannerElement.classList.add('alert-success');
  bannerElement.textContent = messageText;
}

function burnsimEngSetBannerWarning(bannerElement, messageText) {
  if (!bannerElement) return;

  bannerElement.classList.remove('d-none');
  bannerElement.classList.remove('alert-success');
  bannerElement.classList.remove('alert-danger');
  bannerElement.classList.add('alert-warning');
  bannerElement.textContent = messageText;
}

function burnsimEngSetBannerError(bannerElement, messageText) {
  if (!bannerElement) return;

  bannerElement.classList.remove('d-none');
  bannerElement.classList.remove('alert-success');
  bannerElement.classList.remove('alert-warning');
  bannerElement.classList.add('alert-danger');
  bannerElement.textContent = messageText;
}

function burnsimEngShowBlock(blockElement) {
  if (!blockElement) return;
  blockElement.classList.remove('d-none');
}

function burnsimEngHideBlock(blockElement) {
  if (!blockElement) return;
  blockElement.classList.add('d-none');
}

function burnsimEngClearTableBody(tableBodyElement) {
  if (!tableBodyElement) return;
  tableBodyElement.innerHTML = '';
}

function burnsimEngSetTextById(elementId, newText) {
  const element = burnsimEngGetElementByIdStrict(elementId);
  if (!element) return;
  element.textContent = typeof newText === 'string' ? newText : String(newText);
}
/* End BurnSim ENG - DOM helpers */

/* Begin BurnSim ENG - parsing helpers */
function burnsimEngSafeTrim(inputValue) {
  if (typeof inputValue !== 'string') return '';
  return inputValue.trim();
}

function burnsimEngBaseFilename(originalFilename) {
  const filenameText = burnsimEngSafeTrim(originalFilename || '');
  if (!filenameText) return '';

  const lastSlashIndex = Math.max(filenameText.lastIndexOf('/'), filenameText.lastIndexOf('\\'));
  const shortName = lastSlashIndex >= 0 ? filenameText.slice(lastSlashIndex + 1) : filenameText;

  const lastDotIndex = shortName.lastIndexOf('.');
  if (lastDotIndex <= 0) return shortName;

  return shortName.slice(0, lastDotIndex);
}

function burnsimEngIsCommentLine(lineText) {
  const trimmed = burnsimEngSafeTrim(lineText);
  return trimmed.startsWith(';');
}

function burnsimEngParseNumberStrict(numberText) {
  const trimmed = burnsimEngSafeTrim(numberText);
  if (!trimmed) return { ok: false, value: null };

  const parsedValue = Number(trimmed);
  if (!Number.isFinite(parsedValue)) return { ok: false, value: null };

  return { ok: true, value: parsedValue };
}

function burnsimEngSplitLines(sourceText) {
  const normalized = String(sourceText || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return normalized.split('\n');
}

function burnsimEngParseHeaderLine(headerLine) {
  const trimmed = burnsimEngSafeTrim(headerLine);
  const parts = trimmed.split(/\s+/).filter(Boolean);

  if (parts.length < 6) {
    return { ok: false, error: 'Header line appears invalid (expected at least 6 fields).' };
  }

  const designation = parts[0];
  const diameterText = parts[1];
  const lengthText = parts[2];
  const delayText = parts[3];
  const propMassText = parts[4];
  const totalMassText = parts[5];
  const manufacturer = parts.length >= 7 ? parts.slice(6).join(' ') : '';

  const diameter = burnsimEngParseNumberStrict(diameterText);
  const length = burnsimEngParseNumberStrict(lengthText);
  const delay = burnsimEngParseNumberStrict(delayText);
  const propMass = burnsimEngParseNumberStrict(propMassText);
  const totalMass = burnsimEngParseNumberStrict(totalMassText);

  const header = {
    designation: designation,
    diameter: diameter.ok ? diameter.value : null,
    length: length.ok ? length.value : null,
    delay: delay.ok ? delay.value : null,
    prop_mass: propMass.ok ? propMass.value : null,
    total_mass: totalMass.ok ? totalMass.value : null,
    manufacturer: manufacturer
  };

  return { ok: true, header: header };
}

function burnsimEngParseCurveLine(curveLine) {
  const trimmed = burnsimEngSafeTrim(curveLine);
  if (!trimmed) return { ok: false, point: null };

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { ok: false, point: null };

  const timeParsed = burnsimEngParseNumberStrict(parts[0]);
  const thrustParsed = burnsimEngParseNumberStrict(parts[1]);
  if (!timeParsed.ok || !thrustParsed.ok) return { ok: false, point: null };

  return { ok: true, point: { time: timeParsed.value, thrust: thrustParsed.value } };
}
/* End BurnSim ENG - parsing helpers */

/* Begin BurnSim ENG - calculations */
function burnsimEngComputeImpulseNewtonsSeconds(curvePoints) {
  if (!Array.isArray(curvePoints) || curvePoints.length < 2) return 0;

  let totalImpulse = 0;

  for (let pointIndex = 1; pointIndex < curvePoints.length; pointIndex += 1) {
    const prevPoint = curvePoints[pointIndex - 1];
    const currentPoint = curvePoints[pointIndex];

    const deltaTime = currentPoint.time - prevPoint.time;
    if (!Number.isFinite(deltaTime) || deltaTime <= 0) continue;

    const avgThrust = (prevPoint.thrust + currentPoint.thrust) / 2;
    totalImpulse += avgThrust * deltaTime;
  }

  return totalImpulse;
}

function burnsimEngNewtonsToPoundsForce(newtonsValue) {
  const newtonsNumber = Number(newtonsValue);
  if (!Number.isFinite(newtonsNumber)) return 0;
  return newtonsNumber * 0.2248089431;
}


function burnsimEngComputeBurnTime(curvePoints) {
  if (!Array.isArray(curvePoints) || curvePoints.length === 0) return 0;

  const firstTime = curvePoints[0].time;
  const lastTime = curvePoints[curvePoints.length - 1].time;

  if (!Number.isFinite(firstTime) || !Number.isFinite(lastTime)) return 0;
  return Math.max(0, lastTime - firstTime);
}

function burnsimEngComputeMaxThrust(curvePoints) {
  if (!Array.isArray(curvePoints) || curvePoints.length === 0) return 0;

  let maxThrust = 0;

  for (let pointIndex = 0; pointIndex < curvePoints.length; pointIndex += 1) {
    const thrustValue = curvePoints[pointIndex].thrust;
    if (Number.isFinite(thrustValue) && thrustValue > maxThrust) maxThrust = thrustValue;
  }

  return maxThrust;
}

function burnsimEngComputeAverageThrust(totalImpulse, burnTimeSeconds) {
  if (!Number.isFinite(totalImpulse) || !Number.isFinite(burnTimeSeconds) || burnTimeSeconds <= 0) return 0;
  return totalImpulse / burnTimeSeconds;
}

function burnsimEngFindInitialThrust(curvePoints) {
  if (!Array.isArray(curvePoints) || curvePoints.length === 0) return 0;
  const first = curvePoints[0];
  return Number.isFinite(first && first.thrust) ? first.thrust : 0;
}

function burnsimEngFindPeakThrustAndIndex(curvePoints) {
  if (!Array.isArray(curvePoints) || curvePoints.length === 0) return { peakThrust: 0, peakIndex: -1 };

  let peakThrust = -Infinity;
  let peakIndex = -1;

  for (let pointIndex = 0; pointIndex < curvePoints.length; pointIndex += 1) {
    const thrustValue = curvePoints[pointIndex].thrust;
    if (!Number.isFinite(thrustValue)) continue;

    if (thrustValue > peakThrust) {
      peakThrust = thrustValue;
      peakIndex = pointIndex;
    }
  }

  if (!Number.isFinite(peakThrust) || peakThrust < 0) return { peakThrust: 0, peakIndex: -1 };
  return { peakThrust: peakThrust, peakIndex: peakIndex };
}

function burnsimEngComputeDeltaPercent(initialThrust, peakThrust) {
  const initialValue = Number(initialThrust);
  const peakValue = Number(peakThrust);

  if (!Number.isFinite(initialValue) || !Number.isFinite(peakValue) || peakValue <= 0) return 0;

  const delta = peakValue - initialValue;
  const percent = (delta / peakValue) * 100;
  return Math.max(0, Math.min(9999, percent));
}

function burnsimEngFindMotorClass(totalImpulseNs) {
  const impulse = Number(totalImpulseNs);
  if (!Number.isFinite(impulse) || impulse <= 0) {
    return { classLetter: '?', minNs: 0, maxNs: 0, percent: 0 };
  }

  for (let classIndex = 0; classIndex < BurnsimEngMotorClasses.length; classIndex += 1) {
    const motorClass = BurnsimEngMotorClasses[classIndex];
    if (impulse >= motorClass.minNs && impulse <= motorClass.maxNs) {
      const span = motorClass.maxNs - motorClass.minNs;
      const rawPercent = span > 0 ? ((impulse - motorClass.minNs) / span) * 100 : 0;
      const percent = Math.max(0, Math.min(100, rawPercent));
      return { classLetter: motorClass.classLetter, minNs: motorClass.minNs, maxNs: motorClass.maxNs, percent: percent };
    }
  }

  const highest = BurnsimEngMotorClasses[BurnsimEngMotorClasses.length - 1];
  if (impulse > highest.maxNs) {
    return { classLetter: highest.classLetter, minNs: highest.minNs, maxNs: highest.maxNs, percent: 100 };
  }

  return { classLetter: '?', minNs: 0, maxNs: 0, percent: 0 };
}

function burnsimEngRound(valueNumber, digits) {
  const digitsCount = Number.isFinite(digits) ? digits : 2;
  const factor = Math.pow(10, digitsCount);
  return Math.round(valueNumber * factor) / factor;
}
/* End BurnSim ENG - calculations */

/* Begin BurnSim ENG - wrapper */
function burnsimEngBuildWrapper(sourceType, originalFilename) {
  const utcNow = new Date().toISOString();

  return {
    schema: BurnsimEngSchema.schema,
    schema_version: BurnsimEngSchema.schemaVersion,
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
    eng: null
  };
}
/* End BurnSim ENG - wrapper */

/* Begin BurnSim ENG - main parse */
function parseBurnsimEngTextToWrapper(sourceText, sourceType, originalFilename) {
  const wrapper = burnsimEngBuildWrapper(sourceType, originalFilename);
  const lines = burnsimEngSplitLines(sourceText);

  let headerLine = '';
  const curvePoints = [];
  const warnings = [];
  const errors = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const lineText = lines[lineIndex];
    const trimmed = burnsimEngSafeTrim(lineText);

    if (!trimmed) continue;
    if (burnsimEngIsCommentLine(trimmed)) continue;

    headerLine = trimmed;
    break;
  }

  if (!headerLine) {
    wrapper.parse.status = 'error';
    wrapper.parse.errors.push('No header line found. ENG files must have a non-comment header line.');
    return wrapper;
  }

  const headerParsed = burnsimEngParseHeaderLine(headerLine);
  if (!headerParsed.ok) {
    wrapper.parse.status = 'error';
    wrapper.parse.errors.push(headerParsed.error || 'Unable to parse ENG header.');
    return wrapper;
  }

  let curveStartFound = false;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const lineText = lines[lineIndex];
    const trimmed = burnsimEngSafeTrim(lineText);

    if (!trimmed) continue;
    if (burnsimEngIsCommentLine(trimmed)) continue;

    if (!curveStartFound) {
      if (trimmed === headerLine) {
        curveStartFound = true;
        continue;
      }
    } else {
      const pointParsed = burnsimEngParseCurveLine(trimmed);
      if (pointParsed.ok && pointParsed.point) {
        curvePoints.push(pointParsed.point);
        continue;
      } else {
        warnings.push('Skipped non-curve line: "' + trimmed + '"');
      }
    }
  }

  if (curvePoints.length < 2) errors.push('ENG thrust curve requires at least two time/thrust points.');

  const burnTimeSeconds = burnsimEngComputeBurnTime(curvePoints);
  const totalImpulse = burnsimEngComputeImpulseNewtonsSeconds(curvePoints);
  const maxThrust = burnsimEngComputeMaxThrust(curvePoints);
  const avgThrust = burnsimEngComputeAverageThrust(totalImpulse, burnTimeSeconds);

  const initialThrust = burnsimEngFindInitialThrust(curvePoints);
  const peakInfo = burnsimEngFindPeakThrustAndIndex(curvePoints);
  const peakThrust = peakInfo.peakThrust;
  const peakIndex = peakInfo.peakIndex;
  const thrustDeltaPercent = burnsimEngComputeDeltaPercent(initialThrust, peakThrust);

  const motorClass = burnsimEngFindMotorClass(totalImpulse);

  let derivedName = burnsimEngSafeTrim(headerParsed.header.designation || '');
  if (!derivedName && sourceType === 'file') derivedName = burnsimEngBaseFilename(originalFilename);
  if (!derivedName) derivedName = 'eng_motor';

  if (!burnsimEngSafeTrim(headerParsed.header.designation || '')) {
    warnings.push('Engine designation was empty; using derived name. You should set a proper engine name.');
  }

  wrapper.eng = {
    name: derivedName,
    header: headerParsed.header,
    curve: curvePoints,
    derived: {
      point_count: curvePoints.length,
      burn_time_seconds: burnTimeSeconds,
      total_impulse_ns: totalImpulse,
      avg_thrust_n: avgThrust,
        avg_thrust_lbf: burnsimEngNewtonsToPoundsForce(avgThrust),
      max_thrust_n: maxThrust,
        max_thrust_lbf: burnsimEngNewtonsToPoundsForce(maxThrust),
      initial_thrust_n: initialThrust,
      peak_thrust_n: peakThrust,
      peak_index: peakIndex,
      thrust_delta_percent_of_peak: thrustDeltaPercent,
      motor_class: motorClass
    }
  };

  wrapper.parse.errors = errors;
  wrapper.parse.warnings = warnings;

  if (errors.length > 0) wrapper.parse.status = 'error';
  else if (warnings.length > 0) wrapper.parse.status = 'warning';
  else wrapper.parse.status = 'ok';

  return wrapper;
}
/* End BurnSim ENG - main parse */

/* Begin BurnSim ENG - Chart.js helpers */
let burnsimEngThrustChartInstance = null;
let burnsimEngRingChartInstance = null;
let burnsimEngDeltaBarChartInstance = null;

function burnsimEngDestroyChart(chartInstance) {
  if (!chartInstance) return null;
  if (typeof chartInstance.destroy === 'function') chartInstance.destroy();
  return null;
}

function burnsimEngChartJsAvailable() {
  return typeof window.Chart === 'function';
}

function burnsimEngCreateThrustLineChart(canvasElement, curvePoints) {
  if (!canvasElement || !burnsimEngChartJsAvailable()) return null;

  const labels = curvePoints.map(point => point.time);
  const dataValues = curvePoints.map(point => point.thrust);

  const config = {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Thrust (N)',
          data: dataValues,
          pointRadius: 0,
          borderWidth: 2,
          tension: 0.15
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true }
      },
      scales: {
        x: {
          title: { display: true, text: 'Time (s)' },
          ticks: { maxTicksLimit: 12 }
        },
        y: {
          title: { display: true, text: 'Thrust (N)' },
          ticks: { maxTicksLimit: 8 }
        }
      }
    }
  };

  return new window.Chart(canvasElement, config);
}

function burnsimEngCreateClassRingChart(canvasElement, motorClass) {
  if (!canvasElement || !burnsimEngChartJsAvailable()) return null;

  const percentValue = Number(motorClass && motorClass.percent);
  const percent = Number.isFinite(percentValue) ? Math.max(0, Math.min(100, percentValue)) : 0;
  const remainder = 100 - percent;

  const centerTextPlugin = {
    id: 'burnsimEngCenterText',
    afterDraw: function(chart) {
      const chartArea = chart.chartArea;
      if (!chartArea) return;

      const context = chart.ctx;
      const centerX = (chartArea.left + chartArea.right) / 2;
      const centerY = (chartArea.top + chartArea.bottom) / 2;

      const letter = motorClass && motorClass.classLetter ? motorClass.classLetter : '?';
      const displayPercent = burnsimEngRound(percent, 0);

      context.save();
      context.textAlign = 'center';
      context.textBaseline = 'middle';

      context.font = 'bold 26px sans-serif';
      context.fillStyle = '#111';
      context.fillText(letter, centerX, centerY - 14);

      context.font = 'bold 18px sans-serif';
      context.fillStyle = '#111';
      context.fillText(String(displayPercent) + '%', centerX, centerY + 14);

      context.restore();
    }
  };

  const config = {
    type: 'doughnut',
    data: {
      labels: ['Class %', 'Remaining'],
      datasets: [
        {
          data: [percent, remainder],
          borderWidth: 0,
          cutout: '72%'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      }
    },
    plugins: [centerTextPlugin]
  };

  return new window.Chart(canvasElement, config);
}

/* Begin BurnSim ENG - charts - delta bar */
function burnsimEngCreateInitialVsPeakDeltaBar(canvasElement, initialThrust, peakThrust, percentDelta) {
  if (!canvasElement || !burnsimEngChartJsAvailable()) return null;

  const initialValue = Number.isFinite(Number(initialThrust)) ? Number(initialThrust) : 0;
  const peakValue = Number.isFinite(Number(peakThrust)) ? Number(peakThrust) : 0;
  const deltaValue = Math.max(0, peakValue - initialValue);

  const percentValue = Number.isFinite(Number(percentDelta)) ? Number(percentDelta) : 0;

  const deltaLabelPlugin = {
    id: 'burnsimEngDeltaLabel',
    afterDraw: function(chartInstance) {
      const chartArea = chartInstance.chartArea;
      if (!chartArea) return;

      const chartContext = chartInstance.ctx;
      const labelText = burnsimEngRound(percentValue, 0) + '%';

      chartContext.save();
      chartContext.textAlign = 'right';
      chartContext.textBaseline = 'middle';
      chartContext.font = 'bold 14px sans-serif';
      chartContext.fillStyle = '#111';

      chartContext.fillText(
        labelText,
        chartArea.right - 6,
        (chartArea.top + chartArea.bottom) / 2
      );

      chartContext.restore();
    }
  };

  const barSegmentLabelPlugin = {
    id: 'burnsimEngBarSegmentLabels',
    afterDatasetsDraw: function(chartInstance) {
      const metaInitial = chartInstance.getDatasetMeta(0);
      const metaDelta = chartInstance.getDatasetMeta(1);

      if (!metaInitial || !metaDelta) return;
      if (!metaInitial.data || metaInitial.data.length < 1) return;
      if (!metaDelta.data || metaDelta.data.length < 1) return;

      const initialBarElement = metaInitial.data[0];
      const deltaBarElement = metaDelta.data[0];
      if (!initialBarElement || !deltaBarElement) return;

      const chartContext = chartInstance.ctx;
      chartContext.save();

      chartContext.textBaseline = 'middle';
      chartContext.font = 'bold 12px sans-serif';
      chartContext.fillStyle = '#111';

      const initialMidpointX = (initialBarElement.base + initialBarElement.x) / 2;
      const barCenterY = initialBarElement.y;

      chartContext.textAlign = 'center';
      chartContext.fillText('Initial', initialMidpointX, barCenterY);

      chartContext.textAlign = 'right';
      chartContext.fillText('Peak', deltaBarElement.x - 6, barCenterY);

      chartContext.restore();
    }
  };

  const config = {
    type: 'bar',
    data: {
      labels: ['Initial vs Peak'],
      datasets: [
        {
          label: 'Initial',
          data: [initialValue],
          stack: 'thrust'
        },
        {
          label: 'Delta to Peak',
          data: [deltaValue],
          stack: 'thrust'
        }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true }
      },
      scales: {
        x: {
          beginAtZero: true,
          title: { display: true, text: 'Thrust (N)' },
          ticks: { maxTicksLimit: 8 }
        },
        y: {
          ticks: { display: false }
        }
      }
    },
    plugins: [deltaLabelPlugin, barSegmentLabelPlugin]
  };

  return new window.Chart(canvasElement, config);
}
/* End BurnSim ENG - charts - delta bar */

/* End BurnSim ENG - Chart.js helpers */

/* Begin BurnSim ENG - rendering */
function burnsimEngRenderCurveTable(wrapper) {
  const tableElement = burnsimEngGetElementByIdStrict(BurnsimEngUiIds.curveTableId);
  const tableBodyElement = burnsimEngGetElementByIdStrict(BurnsimEngUiIds.curveTableBodyId);
  if (!tableElement || !tableBodyElement) return;

  burnsimEngClearTableBody(tableBodyElement);

  const curve = wrapper && wrapper.eng ? wrapper.eng.curve : [];
  const derived = wrapper && wrapper.eng ? wrapper.eng.derived : null;
  const peakIndex = derived && Number.isFinite(derived.peak_index) ? derived.peak_index : -1;

  if (!Array.isArray(curve) || curve.length === 0) return;

  for (let pointIndex = 0; pointIndex < curve.length; pointIndex += 1) {
    const point = curve[pointIndex];

    const rowElement = document.createElement('tr');

    const isInitialRow = pointIndex === 0;
    const isPeakRow = peakIndex >= 0 && pointIndex === peakIndex;

    if (isInitialRow && isPeakRow) rowElement.classList.add('table-warning');
    else if (isPeakRow) rowElement.classList.add('table-success');
    else if (isInitialRow) rowElement.classList.add('table-info');

    const timeCell = document.createElement('td');
    timeCell.classList.add('text-end');
    timeCell.textContent = String(burnsimEngRound(point.time, 3));

    const thrustCell = document.createElement('td');
    thrustCell.classList.add('text-end');
    thrustCell.textContent = String(burnsimEngRound(point.thrust, 3));

    rowElement.appendChild(timeCell);
    rowElement.appendChild(thrustCell);

    tableBodyElement.appendChild(rowElement);
  }

  burnsimEngShowBlock(tableElement);
}

/* Begin BurnSim ENG - render - derived stats */
function burnsimEngRenderDerivedStats(wrapper) {
  const derived = wrapper && wrapper.eng ? wrapper.eng.derived : null;
  if (!derived) return;

  const motorClass = derived.motor_class || {
    classLetter: '?',
    minNs: 0,
    maxNs: 0,
    percent: 0
  };

  const totalImpulseNs = Number(derived.total_impulse_ns);
  const burnTimeSeconds = Number(derived.burn_time_seconds);
  const avgThrustN = Number(derived.avg_thrust_n);
  const maxThrustN = Number(derived.max_thrust_n);

  const avgThrustLbfDerived = Number(derived.avg_thrust_lbf);
  const maxThrustLbfDerived = Number(derived.max_thrust_lbf);

  const avgThrustLbf = Number.isFinite(avgThrustLbfDerived)
    ? avgThrustLbfDerived
    : burnsimEngNewtonsToPoundsForce(avgThrustN);

  const maxThrustLbf = Number.isFinite(maxThrustLbfDerived)
    ? maxThrustLbfDerived
    : burnsimEngNewtonsToPoundsForce(maxThrustN);

  const classMinRounded = burnsimEngRound(Number(motorClass.minNs), 0);
  const classMaxRounded = burnsimEngRound(Number(motorClass.maxNs), 0);

  burnsimEngSetTextById(
    BurnsimEngUiIds.classTextId,
    'Class ' +
      String(motorClass.classLetter || '?') +
      ' (' +
      String(classMinRounded) +
      '–' +
      String(classMaxRounded) +
      ' ' +
      BurnsimEngUnits.impulseNewtonSeconds +
      ')'
  );

  burnsimEngSetTextById(
    BurnsimEngUiIds.totalImpulseCellId,
    String(burnsimEngRound(totalImpulseNs, 0)) +
      ' ' +
      BurnsimEngUnits.impulseNewtonSeconds
  );

  burnsimEngSetTextById(
    BurnsimEngUiIds.burnTimeCellId,
    String(burnsimEngRound(burnTimeSeconds, 2)) +
      ' ' +
      BurnsimEngUnits.timeSeconds
  );

  burnsimEngSetTextById(
    BurnsimEngUiIds.avgThrustCellId,
    String(burnsimEngRound(avgThrustN, 0)) +
      ' ' +
      BurnsimEngUnits.thrustNewtons
  );

  burnsimEngSetTextById(
    BurnsimEngUiIds.maxThrustCellId,
    String(burnsimEngRound(maxThrustN, 0)) +
      ' ' +
      BurnsimEngUnits.thrustNewtons
  );

  /* Begin BurnSim ENG - render - lbf rows */
  burnsimEngSetTextById(
    'burnsimEngAvgThrustLbfCell',
    String(burnsimEngRound(avgThrustLbf, 0)) +
      ' ' +
      BurnsimEngUnits.thrustPoundsForce
  );

  burnsimEngSetTextById(
    'burnsimEngMaxThrustLbfCell',
    String(burnsimEngRound(maxThrustLbf, 0)) +
      ' ' +
      BurnsimEngUnits.thrustPoundsForce
  );
  /* End BurnSim ENG - render - lbf rows */

  burnsimEngSetTextById(
    BurnsimEngUiIds.pointCountCellId,
    String(derived.point_count)
  );
}
/* End BurnSim ENG - render - derived stats */


function burnsimEngRenderCharts(wrapper) {
  const curve = wrapper && wrapper.eng ? wrapper.eng.curve : [];
  const derived = wrapper && wrapper.eng ? wrapper.eng.derived : null;
  if (!derived || !Array.isArray(curve) || curve.length < 2) return;

  const graphCard = burnsimEngGetElementByIdStrict(BurnsimEngUiIds.graphCardId);
  const resultsCard = burnsimEngGetElementByIdStrict(BurnsimEngUiIds.resultsCardId);

  const thrustCanvas = burnsimEngGetElementByIdStrict(BurnsimEngUiIds.thrustChartCanvasId);
  const ringCanvas = burnsimEngGetElementByIdStrict(BurnsimEngUiIds.classRingCanvasId);
  const deltaBarCanvas = burnsimEngGetElementByIdStrict(BurnsimEngUiIds.deltaBarCanvasId);

  const subtitle = wrapper.eng && wrapper.eng.name ? wrapper.eng.name : '';
  burnsimEngSetTextById(BurnsimEngUiIds.graphSubtitleId, subtitle);

  burnsimEngShowBlock(graphCard);
  burnsimEngShowBlock(resultsCard);

  burnsimEngThrustChartInstance = burnsimEngDestroyChart(burnsimEngThrustChartInstance);
  burnsimEngRingChartInstance = burnsimEngDestroyChart(burnsimEngRingChartInstance);
  burnsimEngDeltaBarChartInstance = burnsimEngDestroyChart(burnsimEngDeltaBarChartInstance);

  burnsimEngThrustChartInstance = burnsimEngCreateThrustLineChart(thrustCanvas, curve);
  burnsimEngRingChartInstance = burnsimEngCreateClassRingChart(ringCanvas, derived.motor_class);

    /* Begin BurnSim ENG - post-render resize */
    window.setTimeout(function() {
      burnsimEngForceChartResize();
    }, 0);
    
    window.setTimeout(function() {
      burnsimEngForceChartResize();
    }, 150);
    /* End BurnSim ENG - post-render resize */
  
  if (deltaBarCanvas) {
    burnsimEngDeltaBarChartInstance = burnsimEngCreateInitialVsPeakDeltaBar(
      deltaBarCanvas,
      derived.initial_thrust_n,
      derived.peak_thrust_n,
      derived.thrust_delta_percent_of_peak
    );
  }
}

function burnsimEngRenderAll(wrapper) {
  burnsimEngRenderDerivedStats(wrapper);
  burnsimEngRenderCharts(wrapper);
  burnsimEngRenderCurveTable(wrapper);
}
/* End BurnSim ENG - rendering */

/* Begin BurnSim ENG - chart resize helper */
function burnsimEngForceChartResize() {
  if (burnsimEngThrustChartInstance && typeof burnsimEngThrustChartInstance.resize === 'function') {
    burnsimEngThrustChartInstance.resize();
  }

  if (burnsimEngDeltaBarChartInstance && typeof burnsimEngDeltaBarChartInstance.resize === 'function') {
    burnsimEngDeltaBarChartInstance.resize();
  }

  if (burnsimEngRingChartInstance && typeof burnsimEngRingChartInstance.resize === 'function') {
    burnsimEngRingChartInstance.resize();
  }
}
/* End BurnSim ENG - chart resize helper */



/* Begin BurnSim ENG - clear routine */
function burnsimEngClearUi() {
  const engNameInput = burnsimEngGetElementByIdStrict(BurnsimEngUiIds.engNameInputId);
  const rawInput = burnsimEngGetElementByIdStrict(BurnsimEngUiIds.rawInputId);
  const fileInput = burnsimEngGetElementByIdStrict(BurnsimEngUiIds.fileInputId);
  const chosenFileName = burnsimEngGetElementByIdStrict(BurnsimEngUiIds.chosenFileNameId);
  const banner = burnsimEngGetElementByIdStrict(BurnsimEngUiIds.statusBannerId);

  const curveTable = burnsimEngGetElementByIdStrict(BurnsimEngUiIds.curveTableId);
  const curveTableBody = burnsimEngGetElementByIdStrict(BurnsimEngUiIds.curveTableBodyId);

  const graphCard = burnsimEngGetElementByIdStrict(BurnsimEngUiIds.graphCardId);
  const resultsCard = burnsimEngGetElementByIdStrict(BurnsimEngUiIds.resultsCardId);

  if (engNameInput) engNameInput.value = '';
  if (rawInput) rawInput.value = '';
  if (fileInput) fileInput.value = '';
  if (chosenFileName) chosenFileName.value = 'No file selected';

  burnsimEngSetBannerHidden(banner);

  burnsimEngHideBlock(curveTable);
  burnsimEngClearTableBody(curveTableBody);

  burnsimEngHideBlock(graphCard);
  burnsimEngHideBlock(resultsCard);

  burnsimEngThrustChartInstance = burnsimEngDestroyChart(burnsimEngThrustChartInstance);
  burnsimEngRingChartInstance = burnsimEngDestroyChart(burnsimEngRingChartInstance);
  burnsimEngDeltaBarChartInstance = burnsimEngDestroyChart(burnsimEngDeltaBarChartInstance);

  burnsimEngSetTextById(BurnsimEngUiIds.graphSubtitleId, '');
  burnsimEngSetTextById(BurnsimEngUiIds.classTextId, '--');
  burnsimEngSetTextById(BurnsimEngUiIds.totalImpulseCellId, '--');
  burnsimEngSetTextById(BurnsimEngUiIds.burnTimeCellId, '--');
  burnsimEngSetTextById(BurnsimEngUiIds.avgThrustCellId, '--');
  burnsimEngSetTextById(BurnsimEngUiIds.maxThrustCellId, '--');
  burnsimEngSetTextById(BurnsimEngUiIds.pointCountCellId, '--');
}
/* End BurnSim ENG - clear routine */

/* Begin BurnSim ENG - UI wiring */
function burnsimEngWireFormSubmitBlocker() {
  const formElement = burnsimEngGetElementByIdStrict(BurnsimEngUiIds.formId);
  if (!formElement) return;

  formElement.addEventListener('submit', function onFormSubmit(event) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
  });
}

function burnsimEngWireChooseFileButton() {
  const chooseFileButton = burnsimEngGetElementByIdStrict(BurnsimEngUiIds.chooseFileButtonId);
  const fileInput = burnsimEngGetElementByIdStrict(BurnsimEngUiIds.fileInputId);
  if (!chooseFileButton || !fileInput) return;

  chooseFileButton.addEventListener('click', function onChooseFileClick() {
    fileInput.click();
  });
}

function burnsimEngWireFileInputChange() {
  const fileInput = burnsimEngGetElementByIdStrict(BurnsimEngUiIds.fileInputId);
  const chosenFileName = burnsimEngGetElementByIdStrict(BurnsimEngUiIds.chosenFileNameId);
  const rawInput = burnsimEngGetElementByIdStrict(BurnsimEngUiIds.rawInputId);
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

function burnsimEngWireParseButton() {
  const parseButton = burnsimEngGetElementByIdStrict(BurnsimEngUiIds.parseButtonId);
  const rawInput = burnsimEngGetElementByIdStrict(BurnsimEngUiIds.rawInputId);
  const fileInput = burnsimEngGetElementByIdStrict(BurnsimEngUiIds.fileInputId);
  const banner = burnsimEngGetElementByIdStrict(BurnsimEngUiIds.statusBannerId);

  const engNameInput = burnsimEngGetElementByIdStrict(BurnsimEngUiIds.engNameInputId);
  const curveTable = burnsimEngGetElementByIdStrict(BurnsimEngUiIds.curveTableId);
  const graphCard = burnsimEngGetElementByIdStrict(BurnsimEngUiIds.graphCardId);
  const resultsCard = burnsimEngGetElementByIdStrict(BurnsimEngUiIds.resultsCardId);

  if (!parseButton || !rawInput || !banner) return;

  parseButton.addEventListener('click', function onParseClick() {
    burnsimEngSetBannerHidden(banner);
    burnsimEngHideBlock(curveTable);
    burnsimEngHideBlock(graphCard);
    burnsimEngHideBlock(resultsCard);

    burnsimEngThrustChartInstance = burnsimEngDestroyChart(burnsimEngThrustChartInstance);
    burnsimEngRingChartInstance = burnsimEngDestroyChart(burnsimEngRingChartInstance);
    burnsimEngDeltaBarChartInstance = burnsimEngDestroyChart(burnsimEngDeltaBarChartInstance);

    const rawText = burnsimEngSafeTrim(rawInput.value || '');
    const selectedFile = fileInput && fileInput.files && fileInput.files.length > 0 ? fileInput.files[0] : null;

    const sourceType = selectedFile ? 'file' : 'paste';
    const originalFilename = selectedFile ? selectedFile.name : '';

    if (!rawText) {
      burnsimEngSetBannerError(banner, 'No input provided. Paste text or choose a file.');
      return;
    }

    const wrapper = parseBurnsimEngTextToWrapper(rawText, sourceType, originalFilename);

    if (wrapper.parse.status === 'error') {
      burnsimEngSetBannerError(banner, wrapper.parse.errors.join('  '));
      return;
    }

    const userOverrideName = engNameInput ? burnsimEngSafeTrim(engNameInput.value || '') : '';
    if (userOverrideName && wrapper.eng) {
      wrapper.eng.name = userOverrideName;
      wrapper.parse.warnings.push('Engine Name overridden by user input. You should verify this name is correct.');
      wrapper.parse.status = 'warning';
    }

    if (engNameInput && wrapper.eng && wrapper.eng.name) engNameInput.value = wrapper.eng.name;

    if (wrapper.parse.status === 'warning') burnsimEngSetBannerWarning(banner, wrapper.parse.warnings.join('  '));
    else burnsimEngSetBannerSuccess(banner, 'Parsed ENG thrust curve with ' + String(wrapper.eng.derived.point_count) + ' points.');

    if (!burnsimEngChartJsAvailable()) {
      wrapper.parse.warnings.push('Chart.js is not available on this page. Table view will still work.');
      burnsimEngSetBannerWarning(banner, wrapper.parse.warnings.join('  '));
    }

    burnsimEngRenderAll(wrapper);
  });
}

function burnsimEngWireClearButton() {
  const clearButton = burnsimEngGetElementByIdStrict(BurnsimEngUiIds.clearButtonId);
  if (!clearButton) return;

  clearButton.addEventListener('click', function onClearClick() {
    burnsimEngClearUi();
  });
}

function burnsimEngInitUi() {
  burnsimEngWireFormSubmitBlocker();
  burnsimEngWireChooseFileButton();
  burnsimEngWireFileInputChange();
  burnsimEngWireParseButton();
  burnsimEngWireClearButton();
}
/* End BurnSim ENG - UI wiring */

/* Begin BurnSim ENG - init */
document.addEventListener('DOMContentLoaded', function onDomReady() {
  burnsimEngInitUi();
});
/* End BurnSim ENG - init */
