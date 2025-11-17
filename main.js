// ===== Theme toggle (clean + robust) =====
const THEME_LIGHT = 'friendly-tech';
const THEME_DARK = 'friendly-dark';

function applyTheme(theme) {
  const html = document.documentElement;
  const t = theme === THEME_DARK ? THEME_DARK : THEME_LIGHT;
  html.setAttribute('data-theme', t);
  html.classList.toggle('theme-dark', t === THEME_DARK);
  html.classList.toggle('theme-light', t === THEME_LIGHT);
  try { localStorage.setItem('ab_guide_theme', t); } catch {}
}

document.addEventListener('DOMContentLoaded', () => {
  const themeSelect = document.getElementById('themeSelect');
  let savedTheme = null;

  try {
    savedTheme = localStorage.getItem('ab_guide_theme');
    if (savedTheme === 'minimal-product') savedTheme = THEME_LIGHT; // Map old value
  } catch {}

  const initial = savedTheme || THEME_LIGHT;
  themeSelect.value = initial;
  applyTheme(initial);

  themeSelect.addEventListener('change', (e) => applyTheme(e.target.value));
  themeSelect.addEventListener('input', (e) => applyTheme(e.target.value));
});

// ===== Helpers =====
const toNum = (v) => {
  if (v === null || v === undefined) return NaN;
  const n = Number(String(v).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : NaN;
};
const pct = (n) => (n * 100).toFixed(2) + '%';
function phi(x){ return (1/Math.sqrt(2*Math.PI))*Math.exp(-0.5*x*x); }
function cdfStandardNormal(x){
  const sign = x < 0 ? -1 : 1;
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const a1=0.319381530, a2=-0.356563782, a3=1.781477937, a4=-1.821255978, a5=1.330274429;
  const m = ((((a5*t + a4)*t + a3)*t + a2)*t + a1)*t;
  const cdf = 1 - phi(Math.abs(x)) * m;
  return sign === 1 ? cdf : 1 - cdf;
}
// Inverse standard normal CDF (Acklam/Beasley–Springer + one Halley step)
function inverseCDF(p){
  if (p <= 0 || p >= 1) return NaN;
  const a=[-3.969683028665376e+01,2.209460984245205e+02,-2.759285104469687e+02,1.383577518672690e+02,-3.066479806614716e+01,2.506628277459239e+00];
  const b=[-5.447609879822406e+01,1.615858368580409e+02,-1.556989798598866e+02,6.680131188771972e+01,-1.328068155288572e+01];
  const c=[-7.784894002430293e-03,-3.223964580411365e-01,-2.400758277161838e+00,-2.549732539343734e+00,4.374664141464968e+00,2.938163982698783e+00];
  const d=[7.784695709041462e-03,3.224671290700398e-01,2.445134137142996e+00,3.754408661907416e+00];
  const pl=0.02425, ph=1-pl;
  let q,r,x;
  if (p < pl) { q=Math.sqrt(-2*Math.log(p));
    x=(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  } else if (p > ph) { q=Math.sqrt(-2*Math.log(1-p));
    x=-(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  } else { q=p-0.5; r=q*q;
    x=(((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  }
  const erf = (x)=>{
    const sign = x < 0 ? -1 : 1; x = Math.abs(x);
    const a1=0.254829592, a2=-0.284496736, a3=1.421413741, a4=-1.453152027, a5=1.061405429, p=0.3275911;
    const t=1/(1+p*x);
    const y=1-((((a5*t+a4)*t+a3)*t+a2)*t+a1)*t*Math.exp(-x*x);
    return sign*y;
  };
  const e = (0.5*(1+erf(x/Math.SQRT2))) - p;
  const u = e * Math.sqrt(2*Math.PI) * Math.exp(0.5*x*x);
  x = x - u/(1 + 0.5*x*u);
  return x;
}

// ===== Quick Lift calculator (NO native submit) =====
const liftForm = document.getElementById('liftForm');
const calcBtn = document.getElementById('calcBtn');
const liftResults = document.getElementById('liftResults');

const aVisitors = document.getElementById('aVisitors');
const aConversions = document.getElementById('aConversions');
const bVisitors = document.getElementById('bVisitors');
const bConversions = document.getElementById('bConversions');

const aRateEl = document.getElementById('aRate');
const bRateEl = document.getElementById('bRate');
const absLiftEl = document.getElementById('absLift');
const relLiftEl = document.getElementById('relLift');

const hypothesisSel = document.getElementById('hypothesis');
const alphaSel = document.getElementById('alpha');

const zScoreEl = document.getElementById('zScore');
const pValueEl = document.getElementById('pValue');
const sigResultEl = document.getElementById('sigResult');

const srmCard = document.getElementById('srmCard');
const srmPEl = document.getElementById('srmP');

const dlCsvBtn = document.getElementById('dlCsvBtn');
const linkBtn = document.getElementById('linkBtn');

// Import/Export controls
const exportPdfBtn = document.getElementById('exportPdfBtn');
const exportPngBtn = document.getElementById('exportPngBtn');
const importCsvBtn = document.getElementById('importCsvBtn');
const importCsvInput = document.getElementById('importCsvInput');

// Block any accidental form submission (Enter key, etc.)
liftForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  e.stopPropagation();
  return false;
});

// Also block Enter from inputs to avoid browser submitting & scrolling
[aVisitors, aConversions, bVisitors, bConversions].forEach(el => {
  el?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      computeLift(); // run calculation on Enter instead
    }
  });
});

function computeLift() {
  const aV = toNum(aVisitors.value);
  const aC = toNum(aConversions.value);
  const bV = toNum(bVisitors.value);
  const bC = toNum(bConversions.value);

  if ([aV, aC, bV, bC].some(n => !Number.isFinite(n) || n < 0)) {
    alert('Please enter valid non-negative numbers in all four fields.');
    return;
  }
  if (aV === 0 || bV === 0) {
    alert('Visitors for both A and B must be greater than zero.');
    return;
  }
  if (aC > aV || bC > bV) {
    alert('Conversions cannot exceed visitors.');
    return;
  }

  const pA = aC / aV;
  const pB = bC / bV;
  const diff = pB - pA;

  aRateEl.textContent = pct(pA);
  bRateEl.textContent = pct(pB);
  absLiftEl.textContent = (diff >= 0 ? '+' : '') + pct(diff);
  relLiftEl.textContent = (pA === 0 ? '—' : ((diff >= 0 ? '+' : '') + (diff / pA * 100).toFixed(2) + '%'));

  // ==== Significance (unpooled SE) ====
  const seA = Math.sqrt(pA * (1 - pA) / aV);
  const seB = Math.sqrt(pB * (1 - pB) / bV);
  const seDiff = Math.sqrt(seA*seA + seB*seB);
  const z = seDiff === 0 ? 0 : (diff / seDiff);

  const alpha = Number(alphaSel?.value ?? 0.05);
  const hypo = hypothesisSel?.value ?? 'two';
  let p;
  if (hypo === 'one') {
    p = 1 - cdfStandardNormal(z);                 // H1: pB > pA
  } else {
    p = 2 * (1 - cdfStandardNormal(Math.abs(z))); // two-sided
  }

  zScoreEl.textContent = z.toFixed(3);
  pValueEl.textContent = p.toFixed(4);
  sigResultEl.innerHTML = (p < alpha)
  ? `<span class="sig-pass">Significant at ${(100 * (1 - alpha)).toFixed(0)}%</span>`
  : `<span class="sig-fail">Not significant at ${(100 * (1 - alpha)).toFixed(0)}%</span>`;
  
  // ==== SRM check for 50/50 ====
  const nTot = aV + bV;
  if (nTot > 0) {
    const zSrm = (Math.abs(aV - nTot/2) - 0.5) / Math.sqrt(nTot * 0.25);
    const pSrm = 2 * (1 - cdfStandardNormal(Math.abs(zSrm)));
    if (pSrm < 0.01) {
      srmCard.hidden = false;
      srmPEl.textContent = pSrm.toFixed(4);
    } else {
      srmCard.hidden = true;
    }
  } else {
    srmCard.hidden = true;
  }

  liftResults.hidden = false;
}

// Click triggers calculation (no navigation or scroll)
calcBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  computeLift();
  return false;
});

// Reset clears results (no jump)
document.getElementById('resetBtn')?.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  liftResults.hidden = true;
});

// ===== CSV download (Quick Lift + inputs) =====
dlCsvBtn?.addEventListener('click', () => {
  const rows = [
    ['Field','Value'],
    ['A Visitors', aVisitors.value],
    ['A Conversions', aConversions.value],
    ['B Visitors', bVisitors.value],
    ['B Conversions', bConversions.value],
    ['Hypothesis', hypothesisSel?.value || 'two'],
    ['Alpha', alphaSel?.value || '0.05'],
    ['A Rate', aRateEl.textContent],
    ['B Rate', bRateEl.textContent],
    ['Absolute Lift', absLiftEl.textContent],
    ['Relative Lift', relLiftEl.textContent],
    ['Z-score', zScoreEl?.textContent || ''],
    ['p-value', pValueEl?.textContent || ''],
  ];

  // Optionally include Sample Size inputs for round-trip import
  const ssBEl = document.getElementById('ssBaseline');
  const ssLiftEl = document.getElementById('ssLift');
  const ssModeEl = document.getElementById('ssMode');
  const ssAbsEl = document.getElementById('ssAbs');
  const ssAlphaEl = document.getElementById('ssAlpha');
  const ssPowerEl = document.getElementById('ssPower');
  if (ssBEl) rows.push(['Baseline', ssBEl.value || '']);
  if (ssLiftEl) rows.push(['Target relative lift (% to detect)', ssLiftEl.value || '']);
  if (ssModeEl) rows.push(['Lift mode', ssModeEl.value || '']);
  if (ssAbsEl) rows.push(['Absolute lift (percentage points)', ssAbsEl.value || '']);
  if (ssAlphaEl) rows.push(['Significance level (α)', ssAlphaEl.value || '']);
  if (ssPowerEl) rows.push(['Power (1−β)', ssPowerEl.value || '']);

  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ab_test_quick_lift.csv';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
});

// ===== Shareable permalink =====
function setQuery(params){
  const usp = new URLSearchParams(params);
  const url = `${location.pathname}?${usp.toString()}${location.hash}`;
  history.replaceState(null, '', url);
}
function getQuery(){
  const usp = new URLSearchParams(location.search);
  const obj = {};
  usp.forEach((v,k)=>obj[k]=v);
  return obj;
}
linkBtn?.addEventListener('click', async () => {
  const q = {
    aV: aVisitors.value || '',
    aC: aConversions.value || '',
    bV: bVisitors.value || '',
    bC: bConversions.value || '',
    hypo: hypothesisSel?.value || 'two',
    alpha: alphaSel?.value || '0.05',
    ssB: document.getElementById('ssBaseline')?.value || '',
    ssLift: document.getElementById('ssLift')?.value || '',
    ssMode: document.getElementById('ssMode')?.value || 'relative',
    ssAbs: document.getElementById('ssAbs')?.value || '',
  };
  setQuery(q);
  const shareUrl = location.href;
  try {
    await navigator.clipboard.writeText(shareUrl);
    alert('Link copied to clipboard!');
  } catch {
    prompt('Copy this link:', shareUrl);
  }
});

// Restore from URL on load (after theme restore)
(function restoreFromURL(){
  const q = getQuery();
  if (q.aV) aVisitors.value = q.aV;
  if (q.aC) aConversions.value = q.aC;
  if (q.bV) bVisitors.value = q.bV;
  if (q.bC) bConversions.value = q.bC;
  if (q.hypo && hypothesisSel) hypothesisSel.value = q.hypo;
  if (q.alpha && alphaSel) alphaSel.value = q.alpha;

  const ssB = document.getElementById('ssBaseline');
  const ssL = document.getElementById('ssLift');
  const ssM = document.getElementById('ssMode');
  const ssA = document.getElementById('ssAbs');
  const ssAbsWrap = document.getElementById('ssAbsWrap');

  if (q.ssB && ssB) ssB.value = q.ssB;
  if (q.ssLift && ssL) ssL.value = q.ssLift;
  if (q.ssMode && ssM) ssM.value = q.ssMode;
  if (q.ssAbs && ssA) ssA.value = q.ssAbs;

  if (ssM && ssAbsWrap) {
    ssAbsWrap.style.display = ssM.value === 'absolute' ? '' : 'none';
  }

  if (aVisitors.value && aConversions.value && bVisitors.value && bConversions.value) {
    computeLift();
  }
})();

// ===== Sample Size calculator =====
const ssForm = document.getElementById('sampleForm');
const ssResults = document.getElementById('sampleResults');

const ssBaseline = document.getElementById('ssBaseline');
const ssLift = document.getElementById('ssLift');
const ssAlpha = document.getElementById('ssAlpha');
const ssPower = document.getElementById('ssPower');

const ssMode = document.getElementById('ssMode');
const ssAbs = document.getElementById('ssAbs');
const ssAbsWrap = document.getElementById('ssAbsWrap');

const ssPerVariant = document.getElementById('ssPerVariant');
const ssTotal = document.getElementById('ssTotal');
const ssP1 = document.getElementById('ssP1');
const ssP2 = document.getElementById('ssP2');
const ssDelta = document.getElementById('ssDelta');

ssMode?.addEventListener('change', () => {
  if (ssAbsWrap) ssAbsWrap.style.display = ssMode.value === 'absolute' ? '' : 'none';
});

ssForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  e.stopPropagation();

  const basePct = toNum(ssBaseline.value);
  const alpha = Number(ssAlpha.value);
  const power = Number(ssPower.value);

  if (!(basePct > 0 && basePct < 100)) { alert('Baseline must be between 0 and 100.'); return; }
  if (!(alpha > 0 && alpha < 1)) { alert('Alpha must be between 0 and 1.'); return; }
  if (!(power > 0 && power < 1)) { alert('Power must be between 0 and 1.'); return; }

  const p1 = basePct / 100;

  let p2;
  if (ssMode?.value === 'absolute') {
    const abs = toNum(ssAbs.value);
    if (!(abs > 0)) { alert('Absolute lift must be > 0.'); return; }
    p2 = p1 + abs/100;  // absolute percentage points
  } else {
    const rel = toNum(ssLift.value);
    if (!(rel > 0)) { alert('Relative lift must be > 0.'); return; }
    p2 = p1 * (1 + rel / 100);
  }

  if (p2 >= 1) { alert('Lift too large for given baseline (p₂ ≥ 100%).'); return; }

  const zAlpha = inverseCDF(1 - alpha/2);
  const zBeta  = inverseCDF(power);

  const pBar = (p1 + p2) / 2;
  const numerator = Math.pow(
    zAlpha * Math.sqrt(2 * pBar * (1 - pBar)) +
    zBeta  * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)),
  2);
  const delta = Math.abs(p2 - p1);
  const nPerVariant = numerator / Math.pow(delta, 2);

  ssP1.textContent = (p1 * 100).toFixed(2) + '%';
  ssP2.textContent = (p2 * 100).toFixed(2) + '%';
  ssDelta.textContent = (delta * 100).toFixed(2) + ' pts';
  ssPerVariant.textContent = Math.round(nPerVariant).toLocaleString();
  ssTotal.textContent = Math.round(2 * nPerVariant).toLocaleString();

  ssResults.hidden = false;
});

document.getElementById('sampleReset')?.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  ssResults.hidden = true;
});

// ===== Export PDF (uses your @media print styles) =====
exportPdfBtn?.addEventListener('click', () => {
  if ((liftResults?.hidden ?? true) && (ssResults?.hidden ?? true)) {
    alert('No results to export. Please calculate first.');
    return;
  }
  window.print();
});

// ===== Export PNG (compose a clean report from visible result cards) =====
async function buildReportNode() {
  const wrap = document.createElement('div');
  wrap.style.padding = '24px';
  wrap.style.background = '#ffffff';
  wrap.style.color = '#000';
  wrap.style.fontFamily = '"Inter", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
  wrap.style.width = '1024px';

  const h = document.createElement('h2');
  h.textContent = 'A/B Test Results Report';
  h.style.margin = '0 0 12px 0';
  wrap.appendChild(h);

  const meta = document.createElement('div');
  meta.style.fontSize = '12px';
  meta.style.marginBottom = '16px';
  meta.textContent = `Generated: ${new Date().toLocaleString()} • Theme: ${document.documentElement.getAttribute('data-theme')}`;
  wrap.appendChild(meta);

  function cloneVisibleContainer(srcEl, titleText){
    if (!srcEl || srcEl.hidden) return;
    const section = document.createElement('section');
    const title = document.createElement('h3');
    title.textContent = titleText;
    title.style.margin = '16px 0 8px';
    section.appendChild(title);

    const cards = srcEl.querySelectorAll('.result-card, .result-note');
    cards.forEach(card => {
      const clone = card.cloneNode(true);
      clone.style.border = '1px solid #e5e7eb';
      clone.style.borderRadius = '12px';
      clone.style.boxShadow = 'none';
      clone.style.background = '#fff';
      section.appendChild(clone);
    });
    wrap.appendChild(section);
  }

  cloneVisibleContainer(liftResults, 'Quick Lift & Significance');
  cloneVisibleContainer(ssResults, 'Sample Size');

  if (!wrap.querySelector('.result-card')) {
    const p = document.createElement('p');
    p.textContent = 'No results to export. Please calculate first.';
    wrap.appendChild(p);
  }
  return wrap;
}

exportPngBtn?.addEventListener('click', async () => {
  if (typeof html2canvas !== 'function') {
    alert('PNG export requires html2canvas. Please ensure the script is loaded.');
    return;
  }
  const node = await buildReportNode();
  document.body.appendChild(node);
  node.style.position = 'fixed';
  node.style.left = '-99999px';
  node.style.top = '0';

  try {
    const canvas = await html2canvas(node, {
      backgroundColor: '#ffffff',
      scale: Math.min(2, window.devicePixelRatio || 1.5),
      useCORS: true
    });
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'ab_test_results.png';
    document.body.appendChild(a); a.click(); a.remove();
  } catch (err) {
    console.error(err);
    alert('Sorry, PNG export failed.');
  } finally {
    node.remove();
  }
});

// ===== Import CSV (prefill fields) =====
const FIELD_MAP = {
  'A Visitors': 'aVisitors',
  'A Conversions': 'aConversions',
  'B Visitors': 'bVisitors',
  'B Conversions': 'bConversions',
  'Hypothesis': 'hypothesis',
  'Alpha': 'alpha',
  'Baseline': 'ssBaseline',
  'Baseline (p₁)': 'ssBaseline',
  'Target relative lift (% to detect)': 'ssLift',
  'Lift mode': 'ssMode',
  'Absolute lift (percentage points)': 'ssAbs',
  'Power (1−β)': 'ssPower',
  'Significance level (α)': 'ssAlpha',
  'A Rate': null,
  'B Rate': null,
  'Absolute Lift': null,
  'Relative Lift': null,
  'Z-score': null,
  'p-value': null
};

importCsvBtn?.addEventListener('click', () => {
  importCsvInput?.click();
});

importCsvInput?.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    let applied = 0;

    for (const line of lines) {
      const cells = [];
      let cur = '', inQuotes = false;
      for (let i=0; i<line.length; i++){
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i+1] === '"') { cur += '"'; i++; }
          else { inQuotes = !inQuotes; }
        } else if (ch === ',' && !inQuotes) {
          cells.push(cur); cur = '';
        } else {
          cur += ch;
        }
      }
      cells.push(cur);

      const key = (cells[0] || '').replace(/^"|"$/g, '').trim();
      const val = (cells[1] || '').replace(/^"|"$/g, '').trim();
      if (!key) continue;

      const id = FIELD_MAP[key] ?? null;
      if (!id) continue;

      const el = document.getElementById(id);
      if (!el) continue;

      if (id === 'alpha') {
        const asNum = Number(val.replace('%','').trim());
        if (!Number.isNaN(asNum) && asNum > 0 && asNum < 100) {
          const alphaGuess = asNum > 1 ? (100 - asNum)/100 : asNum;
          el.value = String(alphaGuess);
        } else {
          el.value = val;
        }
      } else {
        el.value = val;
      }
      applied++;
    }

    if (ssAbsWrap && ssMode) {
      ssAbsWrap.style.display = ssMode.value === 'absolute' ? '' : 'none';
    }

    if (aVisitors.value && aConversions.value && bVisitors.value && bConversions.value) {
      computeLift();
    }

    alert(`Imported ${applied} fields from CSV.`);
  } catch (err) {
    console.error(err);
    alert('Could not read the CSV file.');
  } finally {
    importCsvInput.value = '';
  }
});
