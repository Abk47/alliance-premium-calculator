window.CalculatorApp = (function () {
  let initialized = false;

  function init() {
    if (initialized) return;
    initialized = true;

// Defensive header date setter: set immediately if present, otherwise on DOMContentLoaded
(function setHeaderDateNow() {
  const applyDate = () => {
    const el = document.getElementById('headerDate');
    if (el) el.textContent = new Date().toLocaleDateString('en-TZ', {weekday:'short', day:'numeric', month:'short', year:'numeric'});
  };
  try { applyDate(); } catch (e) {}
  document.addEventListener('DOMContentLoaded', applyDate);
})();

// Keep page starting position at top after refresh/navigation restore
(function resetScrollOnLoad() {
  try {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  } catch (e) {}

  const toTop = () => window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  window.addEventListener('load', toTop);
  window.addEventListener('pageshow', toTop);
})();

// Ensure DOM is ready before accessing other elements

document.addEventListener('DOMContentLoaded', function () {
  // ─── Date in header (kept for backwards-compatibility)
  // previous code already sets the date; the defensive setter above covers timing edge-cases

  // PDF availability check: hide/disable the download button if required libs are missing
  function checkPdfAvailability() {
    const pdfBtn = document.getElementById('downloadPdf');
    if (!pdfBtn) return;
    const hasJsPdf = !!(window.jspdf && window.jspdf.jsPDF);
    const hasHtml2Canvas = !!window.html2canvas;
    const ok = hasJsPdf && hasHtml2Canvas;
    if (!ok) {
      pdfBtn.dataset.disabledReason = !hasJsPdf ? 'jsPDF unavailable' : 'html2canvas unavailable';
    } else {
      delete pdfBtn.dataset.disabledReason;
    }
    return ok;
  }

  // run initial check and also once on full window load (CDNs may load slightly later)
  checkPdfAvailability();
  window.addEventListener('load', checkPdfAvailability);

// ─── Rate Tables ──────────────────────────────────────────────────────────────
const { RATES, LIFE_PLUS_BASE_RATES, WOP, TERM_IDX } = window.CalculatorData || {};

// ── State ─────────────────────────────────────────────────────────────────────
let payMode = 'monthly';
const MODE_FACTORS = {monthly:1, quarterly:3, semi:6, annual:12};
let lastQuoteData = null;
let whatsappLaunchInProgress = false;
let whatsappLastSubmitAt = 0;
let whatsappModalSessionId = 0;
let whatsappLastSentSessionId = -1;
const THEME_STORAGE_KEY = 'alliance-theme';

function applyTheme(theme) {
  const body = document.body;
  if (!body) return;
  const toggleBtn = document.getElementById('themeToggle');
  const isDark = theme === 'dark';
  body.classList.toggle('dark-mode', isDark);
  if (toggleBtn) {
    toggleBtn.textContent = isDark ? '☀️ Light' : '🌙 Dark';
    toggleBtn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
  }
}

function getPreferredTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch (e) {}

  try {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch (e) {}

  return 'light';
}

function initTheme() {
  applyTheme(getPreferredTheme());
}

function toggleTheme() {
  const isDark = document.body && document.body.classList.contains('dark-mode');
  const nextTheme = isDark ? 'light' : 'dark';
  applyTheme(nextTheme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  } catch (e) {}
}

function getAllowedSumAssuredValues(plan, term) {
  if (!plan || plan.includes('Life Plus')) return [];
  const termMap = RATES[plan]?.[term];
  if (!termMap) return [];
  const values = new Set();
  Object.values(termMap).forEach((bracketTable) => {
    Object.keys(bracketTable || {}).forEach((sa) => values.add(Number(sa)));
  });
  return [...values].sort((a, b) => a - b);
}

function setSumAssuredDropdownOptions(plan, term) {
  const saSelectEl = document.getElementById('saSelect');
  if (!saSelectEl) return;

  const currentValue = saSelectEl.value;
  const allowedValues = getAllowedSumAssuredValues(plan, term);

  saSelectEl.innerHTML = '';

  const placeholderOption = document.createElement('option');
  placeholderOption.value = '';
  placeholderOption.textContent = 'Select Sum Assured';
  placeholderOption.hidden = true;
  placeholderOption.selected = true;
  saSelectEl.appendChild(placeholderOption);

  allowedValues.forEach((value) => {
    const option = document.createElement('option');
    option.value = String(value);
    option.textContent = value.toLocaleString('en-TZ');
    saSelectEl.appendChild(option);
  });

  if (currentValue && allowedValues.includes(Number(currentValue))) {
    saSelectEl.value = currentValue;
  }
}

function setMode(m, el) {
  payMode = m;
  document.querySelectorAll('.seg-btn').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-pressed', 'false');
  });
  el.classList.add('active');
  el.setAttribute('aria-pressed', 'true');
}

function syncCashback() {
  const cb = document.getElementById('cashbackToggle').checked;
  const plan = document.getElementById('plan');
  const cur = plan.value;
  if (cb && cur.includes('No cash back')) plan.value = cur.replace('No cash back','With cash back');
  else if (!cb && cur.includes('With cash back')) plan.value = cur.replace('With cash back','No cash back');
}

function autoRecalculate() {
  if (lastQuoteData !== null) calculate();
}

function bindAutoRecalculate() {
  const planEl = document.getElementById('plan');
  if (planEl) planEl.addEventListener('change', autoRecalculate);

  const termEl = document.getElementById('term');
  if (termEl) termEl.addEventListener('change', autoRecalculate);

  const dobEl = document.getElementById('dob');
  if (dobEl) dobEl.addEventListener('change', autoRecalculate);

  const wopEl = document.getElementById('wop');
  if (wopEl) wopEl.addEventListener('change', autoRecalculate);

  // fires after syncCashback (registered first) has already updated plan.value
  const cashbackEl = document.getElementById('cashbackToggle');
  if (cashbackEl) cashbackEl.addEventListener('change', autoRecalculate);

  const saSelectEl = document.getElementById('saSelect');
  if (saSelectEl) saSelectEl.addEventListener('change', autoRecalculate);

  // for Life Plus free-text SA, recalculate on blur (not on every keystroke)
  const saEl = document.getElementById('sa');
  if (saEl) saEl.addEventListener('change', autoRecalculate);
}

function bindUiEventHandlers() {
  document.querySelectorAll('.seg-btn[data-mode]').forEach((btn) => {
    btn.addEventListener('click', function () {
      const mode = this.getAttribute('data-mode');
      if (mode) { setMode(mode, this); autoRecalculate(); }
    });
  });

  const cashbackToggle = document.getElementById('cashbackToggle');
  if (cashbackToggle) cashbackToggle.addEventListener('change', syncCashback);

  const calcBtn = document.getElementById('calculateBtn');
  if (calcBtn) calcBtn.addEventListener('click', calculate);

  const pdfBtn = document.getElementById('downloadPdf');
  if (pdfBtn) pdfBtn.addEventListener('click', downloadPdf);

  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle && themeToggle.dataset.boundClick !== '1') {
    themeToggle.addEventListener('click', toggleTheme);
    themeToggle.dataset.boundClick = '1';
  }

  const whatsappBtn = document.getElementById('sendWhatsapp');
  if (whatsappBtn && whatsappBtn.dataset.boundClick !== '1') {
    whatsappBtn.addEventListener('click', openWhatsappModal);
    whatsappBtn.dataset.boundClick = '1';
  }

  const waCancelBtn = document.getElementById('waCancelBtn');
  if (waCancelBtn && waCancelBtn.dataset.boundClick !== '1') {
    waCancelBtn.addEventListener('click', closeWhatsappModal);
    waCancelBtn.dataset.boundClick = '1';
  }

  const waConfirmBtn = document.getElementById('waConfirmBtn');
  if (waConfirmBtn && waConfirmBtn.dataset.boundClick !== '1') {
    waConfirmBtn.addEventListener('click', function (event) {
      event.preventDefault();
      sendViaWhatsapp();
    });
    waConfirmBtn.dataset.boundClick = '1';
  }

  const waPhoneInput = document.getElementById('waPhoneInput');
  if (waPhoneInput && waPhoneInput.dataset.boundKeydown !== '1') {
    waPhoneInput.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
      }
    });
    waPhoneInput.dataset.boundKeydown = '1';
  }

  const waModal = document.getElementById('whatsappModal');
  if (waModal && waModal.dataset.boundClick !== '1') {
    waModal.addEventListener('click', function (event) {
      if (event.target === waModal) closeWhatsappModal();
    });
    waModal.dataset.boundClick = '1';
  }

  const resultContent = document.getElementById('resultContent');
  if (resultContent) {
    resultContent.addEventListener('click', function (event) {
      const row = event.target.closest('.alt-row[data-coverage]');
      if (!row) return;
      const coverageValue = parseFloat(row.getAttribute('data-coverage'));
      if (isNaN(coverageValue) || coverageValue <= 0) return;
      applyAlternativeCoverageOption(coverageValue);
    });

    resultContent.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const row = event.target.closest('.alt-row[data-coverage]');
      if (!row) return;
      event.preventDefault();
      const coverageValue = parseFloat(row.getAttribute('data-coverage'));
      if (isNaN(coverageValue) || coverageValue <= 0) return;
      applyAlternativeCoverageOption(coverageValue);
    });
  }
}

document.getElementById('dob').addEventListener('change', function() {
  const age = getAgeFromDob(this.value);
  document.getElementById('age').value = age == null ? '' : age;
  // refresh UI constraints that depend on age
  if (typeof updatePlanUI === 'function') updatePlanUI();
});

// make sure WOP toggle is only shown when allowed, and keep cashback checkbox in sync
function updatePlanUI() {
  const planEl = document.getElementById('plan');
  const planVal = planEl.value;
  const termVal = parseInt(document.getElementById('term').value);

  // WOP behaviour
  const isLifePlus = planVal.includes('Life Plus');
  const wopChk = document.getElementById('wop');
  const wopRow = document.getElementById('wopRow');
  if (wopChk) {
    if (isLifePlus) {
      wopChk.checked = false;
      wopChk.disabled = true;
      if (wopRow) wopRow.style.display = 'none';
    } else {
      wopChk.disabled = false;
      if (wopRow) wopRow.style.display = 'flex';
    }
  }

  // Cashback checkbox should mirror the plan selection
  const cbChk = document.getElementById('cashbackToggle');
  if (cbChk) {
    cbChk.checked = planVal.includes('With cash back');
  }

  // adjust sum assured constraints / hints for Life Plus
  const saEl = document.getElementById('sa');
  const saSelectEl = document.getElementById('saSelect');
  if (saEl) {
    if (isLifePlus) {
      saEl.style.display = '';
      if (saSelectEl) saSelectEl.style.display = 'none';
      saEl.dataset.min = '60000000';
      saEl.placeholder = 'e.g. 60,000,000 - 1,000,000,000';
    } else {
      saEl.style.display = 'none';
      if (saSelectEl) saSelectEl.style.display = '';
      setSumAssuredDropdownOptions(planVal, termVal);
      saEl.dataset.min = '5000000';
      saEl.placeholder = 'e.g. 5,000,000';
    }
  }

  // term availability should respect both plan rules and maturity age
  const termEl = document.getElementById('term');
  if (termEl) {
    const MAX_MATURITY_AGE = 70;
    const ageVal = parseInt(document.getElementById('age').value);
    const maxAllowedTermByAge = (isNaN(ageVal) ? Infinity : (MAX_MATURITY_AGE - ageVal));
    const baseOptions = [5,7,10,12,15];
    const planAllowed = isLifePlus ? [10,12,15] : baseOptions;
    const allowed = planAllowed.filter(t => t <= maxAllowedTermByAge);

    const currentValue = parseInt(termEl.value);
    termEl.innerHTML = '';

    if (allowed.length > 0) {
      allowed.forEach((term) => {
        const opt = document.createElement('option');
        opt.value = String(term);
        opt.textContent = `${term} Years`;
        termEl.appendChild(opt);
      });

      // keep current value when valid, otherwise use the largest allowed term
      termEl.value = allowed.includes(currentValue)
        ? String(currentValue)
        : String(Math.max(...allowed));
    } else {
      // no allowed terms for this age — show a single informational placeholder
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No eligible term';
      opt.selected = true;
      termEl.appendChild(opt);
    }
  }

  // Keep sum assured choices aligned with the final active term after term auto-adjustments.
  if (!isLifePlus) {
    const activeTerm = parseInt(document.getElementById('term').value);
    if (!isNaN(activeTerm)) setSumAssuredDropdownOptions(planVal, activeTerm);
  }
}

document.getElementById('plan').addEventListener('change', updatePlanUI);
document.getElementById('term').addEventListener('change', updatePlanUI);
// refresh UI when age input changes too (so terms update immediately)
const ageInputEl = document.getElementById('age');
if (ageInputEl) ageInputEl.addEventListener('input', updatePlanUI);
// initialise state on load
updatePlanUI();
initTheme();
bindUiEventHandlers();
bindAutoRecalculate();

// ─── Sum Assured formatting: show thousand separators while typing ─────────
const saEl = document.getElementById('sa');
function formatWithCommas(v) { return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function setCaret(el, pos) { try { el.setSelectionRange(pos, pos); } catch (e) {} }
if (saEl) {
  saEl.addEventListener('input', function (e) {
    const prev = this.value;
    const start = this.selectionStart || 0;
    // remove non-digits and existing commas
    const raw = prev.replace(/,/g, '').replace(/[^0-9]/g, '');
    if (raw === '') { this.value = ''; return; }
    const formatted = formatWithCommas(raw);
    // adjust caret to account for added/removed commas
    const newPos = start + (formatted.length - prev.length);
    this.value = formatted;
    setCaret(this, newPos);
  });
  saEl.addEventListener('blur', function () {
    if (this.value) this.value = formatWithCommas(this.value.replace(/,/g, ''));
  });
}

function getBracket(age) {
  if (age >= 18 && age <= 45) return 18;
  if (age >= 46 && age <= 55) return 46;
  if (age >= 56 && age <= 60) return 56;
  return null;
}

function getAgeFromDob(dobValue) {
  if (!dobValue) return null;
  const dob = new Date(dobValue);
  if (isNaN(dob.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

function lookupPremium(plan, term, age, sa) {
  // Life Plus uses direct formula: Premium = (SA / 10M) × BaseRate
  if (plan.includes('Life Plus')) {
    const baseRate = LIFE_PLUS_BASE_RATES[plan]?.[term]?.[age];
    if (baseRate == null) return null;
    return (sa / 10000000) * baseRate;
  }
  
  // Other plans use bracket-based interpolation
  const bracket = getBracket(age);
  if (!bracket) return null;
  const tbl = RATES[plan]?.[term]?.[bracket];
  if (!tbl) return null;
  const sas = Object.keys(tbl).map(Number).sort((a,b)=>a-b);
  if (tbl[sa] !== undefined) return tbl[sa];
  const lo = sas.filter(x => x <= sa).pop();
  const hi = sas.filter(x => x >= sa)[0];
  if (!lo || !hi) return null;
  return tbl[lo] + ((sa-lo)/(hi-lo)) * (tbl[hi]-tbl[lo]);
}

function fmtNum(n) { return Math.round(n).toLocaleString('en-TZ'); }
function fmt(n)    { return 'TZS ' + fmtNum(n); }

function animateNumberTransitions(container) {
  if (!container) return;
  const targets = container.querySelectorAll('[data-animate-number]');
  if (!targets.length) return;

  const prefersReducedMotion = (() => {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) {
      return false;
    }
  })();

  targets.forEach((el) => {
    const endValue = Number(el.getAttribute('data-animate-number'));
    if (!Number.isFinite(endValue)) return;

    const prefix = el.getAttribute('data-prefix') || '';
    const duration = 520;

    if (prefersReducedMotion) {
      el.textContent = `${prefix}${fmtNum(endValue)}`;
      return;
    }

    const start = performance.now();
    const startValue = 0;

    const step = (now) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * eased;
      el.textContent = `${prefix}${fmtNum(current)}`;
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  });
}

const UI_MESSAGES = {
  dobRequired: 'Date of Birth is required.',
  dobInvalid: 'Please enter a valid Date of Birth.',
  ageRange: 'Age must be between 18 and 60 years old.',
  saSelectRequired: 'Please select a Sum Assured amount.',
  saInvalid: 'Please enter a valid Sum Assured amount.',
  saLifePlusRange: 'Sum Assured for Life Plus must be between 60,000,000 and 1,000,000,000.',
  saPlanRange: 'Sum Assured must be between 5,000,000 and 100,000,000 for the selected plan.',
  saAllowedValues: 'Sum Assured must be one of the allowed values (5M, 7.5M, 10M,...,100M).',
  noRateFound: 'No rate found for this combination. Check that the sum assured is within the valid range for this plan and term.',
  pdfNeedQuote: 'Please calculate a quotation before downloading the PDF report.',
  pdfLibsMissing: 'PDF generation libraries are unavailable. Please ensure jsPDF and html2canvas are reachable.',
  pdfFailed: 'Failed to generate PDF. Please try again.',
  whatsappNeedQuote: 'Please calculate a quotation before sending via WhatsApp.',
  whatsappPhoneInvalid: 'Please enter a valid customer number in this format: 255XXXXXXXXX.'
};

function isValidWhatsappNumber(phoneNumber) {
  return /^255\d{9}$/.test(phoneNumber);
}

function buildWhatsappMessage(quote) {
  const coverLabel = quote.plan && quote.plan.includes('Education Plan') ? 'Education Cover' : 'Life Cover';

  return [
    'Hello,',
    '',
    'I’ve prepared your life insurance quotation from Alliance Life.',
    '',
    `*Product:* ${quote.plan}`,
    `*Policy Term:* ${quote.term} Years`,
    `*${coverLabel}:* TZS ${fmtNum(quote.sumAssured)}`,
    `*Monthly Premium:* TZS ${fmtNum(quote.monthlyPremium)}`,
    '',
    `*Estimated Maturity Value:* TZS ${fmtNum(quote.maturityValue)}`,
    '',
    'This plan helps protect your family while also building value that you can benefit from over the policy term.',
    '',
    '_*Disclaimer:* The maturity value shown is an estimate based on current declared bonus rates and is not guaranteed. Final benefits are subject to policy terms and future bonus declarations._',
    '',
    'Please feel free to let me know if you’d like to proceed or if you would like me to adjust the coverage or premium to better fit your needs.'
  ].join('\n');
}

function closeWhatsappModal() {
  const modal = document.getElementById('whatsappModal');
  const errEl = document.getElementById('waPhoneError');
  const waConfirmBtn = document.getElementById('waConfirmBtn');
  if (errEl) errEl.textContent = '';
  if (waConfirmBtn) waConfirmBtn.disabled = false;
  if (modal) modal.style.display = 'none';
  whatsappLaunchInProgress = false;
}

function openWhatsappModal() {
  if (!lastQuoteData) {
    alert(UI_MESSAGES.whatsappNeedQuote);
    return;
  }

  const modal = document.getElementById('whatsappModal');
  const input = document.getElementById('waPhoneInput');
  const errEl = document.getElementById('waPhoneError');
  const waConfirmBtn = document.getElementById('waConfirmBtn');
  if (errEl) errEl.textContent = '';
  if (waConfirmBtn) waConfirmBtn.disabled = false;
  whatsappLaunchInProgress = false;
  whatsappModalSessionId += 1;
  if (input && !input.value) input.value = '255';
  if (modal) modal.style.display = 'flex';
  if (input) {
    try { input.focus(); } catch (e) {}
  }
}

function sendViaWhatsapp() {
  const nowGlobal = Date.now();
  const lastGlobalSubmitAt = Number(window.__allianceWaSubmitAt || 0);
  if (nowGlobal - lastGlobalSubmitAt < 1000) return;
  window.__allianceWaSubmitAt = nowGlobal;

  const now = Date.now();
  if (now - whatsappLastSubmitAt < 300) return;
  whatsappLastSubmitAt = now;

  if (whatsappLastSentSessionId === whatsappModalSessionId) return;

  if (whatsappLaunchInProgress) return;

  if (!lastQuoteData) {
    alert(UI_MESSAGES.whatsappNeedQuote);
    return;
  }

  const input = document.getElementById('waPhoneInput');
  const errEl = document.getElementById('waPhoneError');
  const waConfirmBtn = document.getElementById('waConfirmBtn');
  const rawValue = input ? input.value : '';
  const normalizedNumber = String(rawValue || '').replace(/\D/g, '');

  if (!isValidWhatsappNumber(normalizedNumber)) {
    if (errEl) errEl.textContent = UI_MESSAGES.whatsappPhoneInvalid;
    if (input) {
      try { input.focus(); } catch (e) {}
    }
    return;
  }

  whatsappLaunchInProgress = true;
  whatsappLastSentSessionId = whatsappModalSessionId;
  if (waConfirmBtn) waConfirmBtn.disabled = true;

  if (errEl) errEl.textContent = '';
  const message = buildWhatsappMessage(lastQuoteData);
  const whatsappUrl = `https://wa.me/${normalizedNumber}?text=${encodeURIComponent(message)}`;

  try {
    const win = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    if (!win && errEl) {
      errEl.textContent = 'Popup blocked. Please allow popups and try again.';
      whatsappLaunchInProgress = false;
      if (waConfirmBtn) waConfirmBtn.disabled = false;
      whatsappLastSentSessionId = -1;
      return;
    }
  } catch (e) {
    if (errEl) {
      errEl.textContent = 'Unable to open WhatsApp. Please try again.';
    }
    whatsappLaunchInProgress = false;
    if (waConfirmBtn) waConfirmBtn.disabled = false;
    whatsappLastSentSessionId = -1;
    return;
  }

  closeWhatsappModal();
}

function computeBonuses(planName, termYears, sumAssured, monthlyPremiumForCashback) {
  if (window.CalculatorMath && typeof window.CalculatorMath.computeBonuses === 'function') {
    return window.CalculatorMath.computeBonuses(planName, termYears, sumAssured, monthlyPremiumForCashback);
  }

  const hasCashback = String(planName || '').endsWith('With cash back');
  const roundedPremiumForCashback = Math.round(monthlyPremiumForCashback);
  const singleCashback = hasCashback ? 10 * roundedPremiumForCashback : 0;
  const cashbackCount = ({ 5: 1, 7: 2, 10: 3, 12: 4, 15: 5 })[termYears] || 0;
  const totalCashback = cashbackCount * singleCashback;
  const revRate = String(planName || '').includes('Education Plan') ? 0.042 : 0.03;
  const totalRevBonus = revRate * termYears * sumAssured;
  const totalTermBonus = 0.5 * totalRevBonus;
  const maturityValue = sumAssured + totalRevBonus + totalTermBonus + totalCashback;

  return { totalRevBonus, totalTermBonus, singleCashback, totalCashback, maturityValue, cashbackCount };
}

function getAlternativeCoverageOptions(plan, term, age, currentSa, wopEnabled, wopRate, selectedPayMode) {
  const modeFactor = MODE_FACTORS[selectedPayMode] || 1;
  let candidateSas = [];

  if (plan.includes('Life Plus')) {
    const minSa = 60000000;
    const maxSa = 1000000000;
    const step = 10000000;
    candidateSas = [currentSa - step, currentSa + step, currentSa + (step * 2)]
      .filter((value) => value >= minSa && value <= maxSa && value !== currentSa);
  } else {
    const allowedValues = getAllowedSumAssuredValues(plan, term);
    const currentIdx = allowedValues.indexOf(currentSa);
    if (currentIdx === -1) return [];
    const nearby = [
      allowedValues[currentIdx - 1],
      allowedValues[currentIdx + 1],
      allowedValues[currentIdx - 2],
      allowedValues[currentIdx + 2]
    ].filter((value) => value != null && value !== currentSa);
    candidateSas = [...new Set(nearby)].slice(0, 3);
  }

  return candidateSas
    .map((sumAssuredValue) => {
      const base = lookupPremium(plan, term, age, sumAssuredValue);
      if (!base) return null;
      const wopAddonValue = wopEnabled ? base * wopRate : 0;
      const modePremiumValue = (base + wopAddonValue) * modeFactor;
      return {
        sumAssured: sumAssuredValue,
        modePremium: modePremiumValue
      };
    })
    .filter(Boolean);
}

function renderAlternativeCoverageHtml(options, modeLabel) {
  if (!options.length) return '';

  return `
    <div class="alt-coverage">
      <div class="alt-coverage-head">
        <div class="alt-coverage-head-top">
          <div class="card-icon alt-coverage-icon" aria-hidden="true">✨</div>
          <div class="alt-coverage-text">
            <div class="alt-coverage-title">Alternative Coverage Options</div>
            <div class="alt-coverage-sub">Quick comparison by Sum Assured and ${modeLabel.toLowerCase()} premium</div>
          </div>
        </div>
      </div>
      <div class="alt-coverage-list">
        ${options.map((option) => `
          <div class="alt-row" role="button" tabindex="0" data-coverage="${option.sumAssured}" aria-label="Apply coverage TZS ${fmtNum(option.sumAssured)}">
            <div class="alt-sa">
              <span class="alt-label">Coverage</span>
              <span class="alt-value">TZS ${fmtNum(option.sumAssured)}</span>
            </div>
            <div class="alt-premium">
              <span class="alt-label">${modeLabel} Premium</span>
              <span class="alt-value alt-value-accent">TZS ${fmtNum(option.modePremium)}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function applyAlternativeCoverageOption(sumAssuredValue) {
  const plan = document.getElementById('plan').value;
  const isLifePlus = plan.includes('Life Plus');
  const saInputEl = document.getElementById('sa');
  const saSelectEl = document.getElementById('saSelect');

  if (isLifePlus) {
    if (saInputEl) saInputEl.value = fmtNum(sumAssuredValue);
  } else if (saSelectEl) {
    const targetValue = String(sumAssuredValue);
    let option = [...saSelectEl.options].find((item) => item.value === targetValue);
    if (!option) {
      option = document.createElement('option');
      option.value = targetValue;
      option.textContent = fmtNum(sumAssuredValue);
      saSelectEl.appendChild(option);
    }
    saSelectEl.value = targetValue;
  }

  calculate();
}

// simple helper to escape text before inserting in innerHTML
function escapeHTML(str) {
  return str.replace(/[&<>"'\/]/g, function (s) {
    const entityMap = {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;","/":"&#x2F;"};
    return entityMap[s];
  });
}

function scrollToQuotationSummary() {
  const target =
    document.querySelector('.right-col .card-header') ||
    document.querySelector('.right-col') ||
    document.getElementById('result');
  if (!target) return;

  const headerEl = document.querySelector('header');
  const headerOffset = (headerEl ? headerEl.getBoundingClientRect().height : 0) + 10;
  const rect = target.getBoundingClientRect();

  const alreadyInView =
    rect.top >= headerOffset &&
    rect.top <= Math.max(headerOffset + 24, window.innerHeight * 0.25);
  if (alreadyInView) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const top = Math.max(0, window.scrollY + rect.top - headerOffset);
  window.scrollTo({
    top,
    behavior: prefersReducedMotion ? 'auto' : 'smooth'
  });
}

function calculate() {
  const errDiv = document.getElementById('errorMsg');
  const errTxt = document.getElementById('errorText');
  const contentDiv = document.getElementById('resultContent');
  const emptyState = document.getElementById('emptyState');
  const result = document.getElementById('result');
  const pdfBtn = document.getElementById('downloadPdf');
  const whatsappBtn = document.getElementById('sendWhatsapp');

  errDiv.style.display = 'none';
  // hide download link until a fresh result is ready
  if (pdfBtn) pdfBtn.style.display = 'none';
  if (whatsappBtn) whatsappBtn.style.display = 'none';

  const ageEl = document.getElementById('age');
  const dobRaw = document.getElementById('dob').value;
  const age = getAgeFromDob(dobRaw);
  if (ageEl && age != null) ageEl.value = age;
  const plan = document.getElementById('plan').value;
  const term = parseInt(document.getElementById('term').value);
  const isLifePlus = plan.includes('Life Plus');
  const saInputEl = document.getElementById('sa');
  const saSelectEl = document.getElementById('saSelect');
  const saRaw = isLifePlus
    ? (saInputEl ? saInputEl.value.replace(/,/g,'') : '')
    : (saSelectEl ? saSelectEl.value : '');
  const sa = parseFloat(saRaw);
  let wop = document.getElementById('wop').checked;
  const hasCashback = plan.includes('With cash back');

  // ensure entry age + term does not exceed maximum maturity age
  const MAX_MATURITY_AGE = 70;
  const baseOptions = [5,7,10,12,15];
  const planAllowed = plan.includes('Life Plus') ? [10,12,15] : baseOptions;
  const ageVal = isNaN(age) ? null : age;
  const maxAllowedTerm = (ageVal === null) ? Infinity : (MAX_MATURITY_AGE - ageVal);
  if (ageVal === null) {
    // age validation handled below
  } else if (maxAllowedTerm <= 0) {
    showError(`Entry age exceeds maximum maturity age (${MAX_MATURITY_AGE}).`);
    return;
  } else {
    const allowedTerms = planAllowed.filter(t => t <= maxAllowedTerm);
    if (allowedTerms.length === 0) {
      showError(`No available term options for entry age ${ageVal}. Please choose a younger entry age.`);
      return;
    }
    if (!allowedTerms.includes(term)) {
      const asStr = allowedTerms.map(String);
      let listStr = '';
      if (asStr.length === 1) listStr = `${asStr[0]}`;
      else if (asStr.length === 2) listStr = `${asStr[0]} or ${asStr[1]}`;
      else listStr = `${asStr.slice(0,-1).join(', ')} or ${asStr.slice(-1)}`;
      showError(`Please choose one of the available terms: ${listStr} years.`);
      return;
    }
  }

  // Life Plus plans do not carry a WOP rider
  if (plan.includes('Life Plus')) {
    wop = false;
  }
  let name = document.getElementById('clientName').value.trim();
  name = escapeHTML(name); // ensure injected into markup safely

  function showError(msg) {
    errTxt.textContent = msg;
    errDiv.style.display = 'flex';
    result.style.display = 'none';
    emptyState.style.display = 'block';
    try { errDiv.focus(); } catch (e) {}
  }

  if (!dobRaw) { showError(UI_MESSAGES.dobRequired); return; }
  if (age == null || isNaN(age)) { showError(UI_MESSAGES.dobInvalid); return; }
  if (age < 18 || age > 60) { showError(UI_MESSAGES.ageRange); return; }
  if (!isLifePlus && !saRaw) { showError(UI_MESSAGES.saSelectRequired); return; }
  if (!sa || isNaN(sa) || sa <= 0) { showError(UI_MESSAGES.saInvalid); return; }
  if (isLifePlus) {
    if (sa < 60000000 || sa > 1000000000) {
      showError(UI_MESSAGES.saLifePlusRange);
      return;
    }
  } else {
    // Life Plan & Education Plan limits
    if (sa < 5000000 || sa > 100000000) {
      showError(UI_MESSAGES.saPlanRange);
      return;
    }
    const allowedValues = getAllowedSumAssuredValues(plan, term);
    if (!allowedValues.includes(sa)) {
      showError(UI_MESSAGES.saAllowedValues);
      return;
    }
  }

  const bracket = getBracket(age);

  const wopIdx = TERM_IDX[term];
  let wopRate = 0;
  if (wop) {
    wopRate = WOP[age]?.[wopIdx];
    if (wopRate == null) { showError(`WOP rider is not available for age ${age} on a ${term}-year term.`); return; }
  }

  const basePremium = lookupPremium(plan, term, age, sa);
  if (!basePremium) { showError(UI_MESSAGES.noRateFound); return; }

  const wopAddon = wop ? basePremium * wopRate : 0;
  const monthlyTotal = basePremium + wopAddon;
  const modeFactor = MODE_FACTORS[payMode];
  const modeLabels = {monthly:'Monthly', quarterly:'Quarterly', semi:'Semi-Annual', annual:'Annual'};
  const periodPremium = monthlyTotal * modeFactor;
  const annualPremium = monthlyTotal * 12;
  const roundedMonthlyPremium = Math.round(monthlyTotal);
  const roundedPeriodPremium = Math.round(periodPremium);
  const bonusResult = computeBonuses(plan, term, sa, monthlyTotal);
  // Cashback = 10× monthly premium, paid every 36 contributions within policy term
  const numPayouts = bonusResult.cashbackCount;
  const cashbackMonths = [36, 72, 108, 144, 180].slice(0, numPayouts);
  const cashbackAmt = hasCashback ? bonusResult.singleCashback : 0;
  const totalCashback = hasCashback ? bonusResult.totalCashback : 0;
  const totalPremiumsTerm = monthlyTotal * 12 * term;
  const modeLabel = modeLabels[payMode];
  const modePremiumLabel = `Total ${modeLabel} Premium`;
  const alternativeCoverageOptions = getAlternativeCoverageOptions(plan, term, age, sa, wop, wopRate, payMode);
  const alternativeCoverageHtml = renderAlternativeCoverageHtml(alternativeCoverageOptions, modeLabel);

  lastQuoteData = {
    clientName: name,
    dobRaw,
    age,
    plan,
    term,
    sumAssured: sa,
    monthlyPremium: monthlyTotal,
    periodPremium,
    paymentMode: modeLabel,
    wopIncluded: wop,
    totalPremiumContribution: totalPremiumsTerm,
    totalRevBonus: bonusResult.totalRevBonus,
    totalTermBonus: bonusResult.totalTermBonus,
    singleCashback: bonusResult.singleCashback,
    totalCashback: bonusResult.totalCashback,
    maturityValue: bonusResult.maturityValue,
    cashbackCount: bonusResult.cashbackCount,
    quotationDate: new Date()
  };

  emptyState.style.display = 'none';
  result.style.display = 'block';
  if (pdfBtn) {
    try {
      if (checkPdfAvailability()) pdfBtn.style.display = 'flex';
      else pdfBtn.style.display = 'none';
    } catch (e) { pdfBtn.style.display = 'none'; }
  }
  if (whatsappBtn) whatsappBtn.style.display = 'flex';

  // assembly of result markup is mostly fixed values; name has already been escaped
  contentDiv.innerHTML = `
    <div class="result-wrapper">
      <div class="result-hero">
        <div class="geo"></div>
        ${name ? `<div class="for-name">Prepared for ${name}</div>` : ''}
        <div class="result-mode-lbl">${modePremiumLabel}</div>
        <div class="result-amount">
          <span class="result-amount-currency">TZS</span><span data-animate-number="${Math.round(periodPremium)}">${fmtNum(periodPremium)}</span>
        </div>
        <div class="result-period-tag">
          <span class="dot"></span>
          ${modeLabel} · ${term}-Year Term · ${plan}
        </div>
        ${wop ? `<div class="wop-badge">🛡️ WOP Rider Included</div>` : ''}
      </div>

      <div class="breakdown-grid">
        <div class="breakdown-cell">
          <div class="bc-lbl">Basic Premium</div>
          <div class="bc-val" data-animate-number="${Math.round(basePremium)}" data-prefix="TZS ">TZS ${fmtNum(basePremium)}</div>
        </div>
        <div class="breakdown-cell">
          <div class="bc-lbl">Annual Premium</div>
          <div class="bc-val" data-animate-number="${Math.round(annualPremium)}" data-prefix="TZS ">TZS ${fmtNum(annualPremium)}</div>
        </div>
        ${wop ? `
        <div class="breakdown-cell">
          <div class="bc-lbl">WOP Rider Premium</div>
          <div class="bc-val" data-animate-number="${Math.round(wopAddon)}" data-prefix="TZS ">TZS ${fmtNum(wopAddon)}</div>
        </div>` : ''}
        <div class="breakdown-cell">
          <div class="bc-lbl">Premium Payable (${term} Years)</div>
          <div class="bc-val" data-animate-number="${Math.round(totalPremiumsTerm)}" data-prefix="TZS ">TZS ${fmtNum(totalPremiumsTerm)}</div>
        </div>
        <div class="breakdown-cell">
          <div class="bc-lbl">Plan</div>
          <div class="bc-val">${plan}</div>
        </div>
        <div class="breakdown-cell">
          <div class="bc-lbl">Sum Assured</div>
          <div class="bc-val" data-animate-number="${Math.round(sa)}" data-prefix="TZS ">TZS ${fmtNum(sa)}</div>
        </div>
      </div>

      ${alternativeCoverageHtml}
    </div>

    ${hasCashback ? `
    <div class="cashback-banner">
      <div class="cb-icon">💰</div>
      <div class="cb-text">
        <div class="cb-title">Cash Back Benefit - ${numPayouts} Payout${numPayouts > 1 ? 's' : ''}</div>
        <div class="cb-amount">TZS ${fmtNum(cashbackAmt)} <span style="font-size:.85rem;font-family:'Outfit',sans-serif;font-weight:500;color:rgba(255,255,255,.5)">× ${numPayouts} = TZS ${fmtNum(totalCashback)}</span></div>
        <div class="cb-milestones">
          ${cashbackMonths.map((month, idx) => `<div class="cb-mile"><span class="cb-mile-num">${idx + 1}</span><span>After ${month} contributions</span></div>`).join('')}
        </div>
        <div class="cb-sub">Each payout = 10× the monthly premium of TZS ${fmtNum(roundedMonthlyPremium)}</div>
      </div>
    </div>` : ''}
  `;

  animateNumberTransitions(contentDiv);

  setTimeout(scrollToQuotationSummary, 50);
}

// download the currently displayed quotation as a PDF file
async function downloadPdf() {
  if (!lastQuoteData) {
    alert(UI_MESSAGES.pdfNeedQuote);
    return;
  }

  const hasJsPdf = !!(window.jspdf && window.jspdf.jsPDF);
  const hasHtml2Canvas = !!window.html2canvas;
  if (!hasJsPdf || !hasHtml2Canvas) {
    console.warn('PDF libraries missing', { jsPDF: hasJsPdf, html2canvas: hasHtml2Canvas });
    alert(UI_MESSAGES.pdfLibsMissing);
    return;
  }

  const safe = (value) => escapeHTML(String(value == null ? '' : value));
  const q = lastQuoteData;
  const dobText = q.dobRaw ? new Date(q.dobRaw).toLocaleDateString('en-TZ', { day:'2-digit', month:'short', year:'numeric' }) : '-';
  const quoteDateText = q.quotationDate ? q.quotationDate.toLocaleDateString('en-TZ', { day:'2-digit', month:'short', year:'numeric' }) : new Date().toLocaleDateString('en-TZ');
  const logoImg = document.querySelector('.logo-shield img');
  const logoSrc = logoImg ? logoImg.getAttribute('src') : '';

  const pdfShell = document.createElement('div');
  pdfShell.style.position = 'fixed';
  pdfShell.style.left = '-10000px';
  pdfShell.style.top = '0';
  pdfShell.style.pointerEvents = 'none';
  pdfShell.style.zIndex = '-1';
  pdfShell.style.width = '760px';
  pdfShell.style.background = '#ffffff';
  pdfShell.style.padding = '18px';
  pdfShell.style.fontFamily = 'Arial, Helvetica, sans-serif';
  pdfShell.style.color = '#111111';

  pdfShell.innerHTML = `
    <div style="border:1px solid #cfd2d8;">
      <div style="padding:10px 12px;text-align:center;font-size:18px;font-weight:800;letter-spacing:.08em;border-bottom:1px solid #cfd2d8;background:linear-gradient(135deg,#000b91 0%,#1a22a8 72%,#ed0800 100%);color:#ffffff;">
        <div>Life Insurance Premium Quotation</div>
      </div>
      <div style="display:grid;grid-template-columns: 1fr 180px;">
        <div style="padding:10px;border-right:1px solid #cfd2d8;border-bottom:1px solid #cfd2d8;line-height:1.35;">
          <div style="font-weight:700;">Company Address</div>
          <div>P. O. Box 11522,</div>
          <div>5th Floor, Exim Tower, Ghana Avenue,</div>
          <div>Dar Es Salaam, Tanzania</div>
          <div>+255 22 210300/01/02/03</div>
        </div>
        <div style="padding:10px;border-bottom:1px solid #cfd2d8;display:flex;align-items:center;justify-content:center;">
          ${logoSrc ? `<img src="${safe(logoSrc)}" alt="Company Logo" style="max-width:150px;max-height:72px;object-fit:contain;" />` : `<div style="font-weight:700;">Company Logo</div>`}
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tbody>
          ${[
            ['Quotation Date', quoteDateText],
            ["Client's Full name", safe(q.clientName || 'Not provided')],
            ['Age', `${safe(q.age)} years`],
            ['Date of Birth', dobText],
            ['Product', safe(q.plan)],
            ['Payment Mode', safe(q.paymentMode)],
            ['Policy Term', `${safe(q.term)} years`],
            ['Sum Assured', `TZS ${fmtNum(q.sumAssured)}`],
           
            ['Premium', `TZS ${fmtNum(q.periodPremium)} (${safe(q.paymentMode)})`],
            ['Single Cashback', `TZS ${fmtNum(q.singleCashback)}`],
            ['Total cash back', `TZS ${fmtNum(q.totalCashback)}`],
            ['Total Premium Payable (' + safe(q.term) + ' Years)', `TZS ${fmtNum(q.totalPremiumContribution)}`],
            ['Estimated Reversionary Bonus', `TZS ${fmtNum(q.totalRevBonus)}`],
            ['Estimated Terminal Bonus', `TZS ${fmtNum(q.totalTermBonus)}`],
            ['Estimated Maturity Value', `<strong>TZS ${fmtNum(q.maturityValue)}</strong>`]
          ].map(([label, value]) => `
            <tr>
              <td style="width:42%;border:1px solid #cfd2d8;padding:7px 8px;font-weight:600;">${label}</td>
              <td style="border:1px solid #cfd2d8;padding:7px 8px;">${value}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="padding:10px;border-top:1px solid #cfd2d8;font-size:12px;line-height:1.45;">
        <strong>Data Privacy Notice</strong><br/>
        Your personal data is processed by Alliance Life Assurance Limited solely for quotation and policy administration purposes, in line with applicable data protection laws. For privacy inquiries, contact: privacy@alliancelife.co.tz | +255 22 210300.
      </div>

      <div style="padding:10px;border-top:1px solid #cfd2d8;font-size:13px;line-height:1.45;">
        <strong>Acknowledgement</strong><br/>
        I confirm that I have received and understood this quotation and data privacy notice.
      </div>

      <div style="padding:10px;border-top:1px solid #cfd2d8;font-size:13px;line-height:1.7;">
        <strong>Applicant Signature:</strong> ____________________<br/>
        <strong>Full Name:</strong> ____________________<br/>
        <strong>Date:</strong> ____________________
      </div>

      <div style="padding:8px 10px;border-top:1px solid #cfd2d8;font-size:11px;line-height:1.4;">
        <strong>Disclaimer:</strong> Figures shown are estimates based on information provided at quotation stage and applicable pricing assumptions.
      </div>

      <div style="padding:8px 10px;border-top:1px solid #cfd2d8;font-size:11px;line-height:1.4;">
        <strong>Terms and Conditions:</strong> In case of any difference between this quotation and the final issued policy schedule, the policy schedule shall prevail.
      </div>
    </div>
  `;

  document.body.appendChild(pdfShell);

  try {
    const canvas = await window.html2canvas(pdfShell, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4', putOnlyUsedFonts: true });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const printableWidth = pageWidth - margin * 2;
    const printableHeight = pageHeight - margin * 2;

    const widthScale = printableWidth / canvas.width;
    const heightScale = printableHeight / canvas.height;
    const fitScale = Math.min(widthScale, heightScale);

    const imgWidth = canvas.width * fitScale;
    const imgHeight = canvas.height * fitScale;
    const x = margin + (printableWidth - imgWidth) / 2;
    const y = margin + (printableHeight - imgHeight) / 2;

    doc.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight, undefined, 'FAST');

    try {
      const blobUrl = doc.output('bloburl');
      const win = window.open(blobUrl, '_blank', 'noopener,noreferrer');
      if (win) {
        try { win.opener = null; } catch (e) {}
      }
      if (!win) {
        doc.save('quotation.pdf');
      }
    } catch (openErr) {
      doc.save('quotation.pdf');
    }
  } catch (err) {
    console.error('PDF rendering failed', err);
    alert(UI_MESSAGES.pdfFailed);
  } finally {
    if (pdfShell && pdfShell.parentNode) {
      pdfShell.parentNode.removeChild(pdfShell);
    }
  }
}


  // expose select helpers to the global scope for inline `onclick` handlers
  // (the HTML uses `onclick="calculate()"`, `onclick="setMode(...)"`, etc.)
  try {
    window.calculate = calculate;
    window.setMode = setMode;
    window.downloadPdf = downloadPdf;
    window.syncCashback = syncCashback;
  } catch (e) {
    // ignore if running in an environment without window
  }

  // re-check PDF library availability after exposing functions
  try { checkPdfAvailability(); } catch (e) {}


});
  }

  return { init };
})();