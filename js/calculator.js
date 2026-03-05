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
const RATES = {};
function addRate(plan, term, bracket, sa, premium) {
  if (!RATES[plan]) RATES[plan] = {};
  if (!RATES[plan][term]) RATES[plan][term] = {};
  if (!RATES[plan][term][bracket]) RATES[plan][term][bracket] = {};
  RATES[plan][term][bracket][sa] = premium;
}

// ── Life Plus Base Rates per 10,000,000 TZS ────────────────────────────────────
const LIFE_PLUS_BASE_RATES = {
  'Life Plus- No cash back': {
    10: {18:94386,19:94409,20:94437,21:94469,22:94506,23:94548,24:94592,25:94639,26:94689,27:94742,28:94799,29:94861,30:94930,31:95005,32:95088,33:95180,34:95283,35:95398,36:95525,37:95663,38:95809,39:95958,40:96103,41:96259,42:96426,43:96602,44:96796,45:97011,46:97244,47:97502,48:97799,49:98149,50:98577,51:99052,52:99583,53:100174,54:100840,55:101592,56:102403,57:103270,58:104193,59:105162,60:106162},
    12: {18:74768,19:74794,20:74826,21:74861,22:74902,23:74947,24:74995,25:75046,26:75102,27:75160,28:75224,29:75293,30:75370,31:75454,32:75546,33:75648,34:75760,35:75886,36:76023,37:76172,38:76328,39:76490,40:76648,41:76819,42:77004,43:77202,44:77420,45:77662,46:77928,47:78224,48:78563,49:78960,50:79439,51:79969,52:80557,53:81209,54:81936,55:82752,56:83629,57:84567,58:85565,59:86614,60:87703},
    15: {18:57442,19:57473,20:57509,21:57549,22:57595,23:57646,24:57700,25:57759,26:57822,27:57890,28:57963,29:58042,30:58131,31:58226,32:58330,33:58446,34:58572,35:58712,36:58864,37:59028,38:59202,39:59382,40:59563,41:59760,42:59974,43:60205,44:60461,45:60747,46:61062,47:61414,48:61816,49:62279,50:62826,51:63429,52:64095,53:64828,54:65640,55:66545,56:67516,57:68554,58:69660,59:70824,60:72037}
  },
  'Life Plus- With cash back': {
    10: {18:127956,19:127984,20:128018,21:128056,22:128101,23:128152,24:128204,25:128261,26:128322,27:128386,28:128455,29:128529,30:128613,31:128703,32:128802,33:128915,34:129038,35:129177,36:129330,37:129497,38:129674,39:129855,40:130029,41:130218,42:130418,43:130632,44:130865,45:131123,46:131403,47:131714,48:132068,49:132488,50:133001,51:133571,52:134209,53:134918,54:135716,55:136619,56:137592,57:138633,58:139740,59:140901,60:142100},
    12: {18:105316,19:105347,20:105385,21:105428,22:105478,23:105534,24:105591,25:105654,26:105722,27:105793,28:105870,29:105954,30:106048,31:106150,32:106262,33:106387,34:106524,35:106676,36:106844,37:107025,38:107216,39:107413,40:107605,41:107814,42:108038,43:108278,44:108542,45:108834,46:109154,47:109512,48:109920,49:110398,50:110977,51:111616,52:112327,53:113113,54:113990,55:114974,56:116031,57:117160,58:118404,59:119672,60:120987},
    15: {18:79490,19:79528,20:79573,21:79623,22:79680,23:79744,24:79811,25:79884,26:79963,27:80046,28:80138,29:80237,30:80347,31:80465,32:80595,33:80739,34:80896,35:81070,36:81258,37:81462,38:81679,39:81903,40:82127,41:82372,42:82636,43:82923,44:83240,45:83594,46:83984,47:84420,48:84915,49:85488,50:86165,51:86911,52:87734,53:88640,54:89643,55:90760,56:91958,57:93238,58:94598,59:96031,60:97522}
  }
};

// ── Life Plan – No Cash Back ──────────────────────────────────────────────────
const LP_NO_T5  = {18:[10e6,171130,12.5e6,213912.5,15e6,256695,17.5e6,299477.5,20e6,342260,25e6,427825,30e6,513390,35e6,598955,40e6,684520,45e6,770085,50e6,855650,55e6,941215,60e6,1026780], 46:[10e6,173855,12.5e6,217318.75,15e6,260782.5,17.5e6,304246.25,20e6,347710,25e6,434637.5,30e6,521565,35e6,608492.5,40e6,695420,45e6,782347.5,50e6,869275,55e6,956202.5,60e6,1043130], 56:[10e6,175490,12.5e6,219362.5,15e6,263235,17.5e6,307107.5,20e6,350980,25e6,438725,30e6,526470,35e6,614215,40e6,701960,45e6,789705,50e6,877450,55e6,965195,60e6,1052940]};
const LP_NO_T7  = {18:[10e6,119500,12.5e6,149375,15e6,179250,17.5e6,209125,20e6,239000,25e6,298750,30e6,358500,35e6,418250,40e6,478000,45e6,537750,50e6,597500,55e6,657250,60e6,717000], 46:[10e6,122000,12.5e6,152500,15e6,183000,17.5e6,213500,20e6,244000,25e6,305000,30e6,366000,35e6,427000,40e6,488000,45e6,549000,50e6,610000,55e6,671000,60e6,732000], 56:[10e6,124500,12.5e6,155625,15e6,186750,17.5e6,217875,20e6,249000,25e6,311250,30e6,373500,35e6,435750,40e6,498000,45e6,560250,50e6,622500,55e6,684750,60e6,747000]};
const LP_NO_T10 = {18:[10e6,92000,12.5e6,115000,15e6,138000,17.5e6,161000,20e6,184000,25e6,230000,30e6,276000,35e6,322000,40e6,368000,45e6,414000,50e6,460000,55e6,506000,60e6,552000], 46:[10e6,94500,12.5e6,118125,15e6,141750,17.5e6,165375,20e6,189000,25e6,236250,30e6,283500,35e6,330750,40e6,378000,45e6,425250,50e6,472500,55e6,519750,60e6,567000], 56:[10e6,98000,12.5e6,122500,15e6,147000,17.5e6,171500,20e6,196000,25e6,245000,30e6,294000,35e6,343000,40e6,392000,45e6,441000,50e6,490000,55e6,539000,60e6,588000]};
const LP_NO_T12 = {18:[5e6,37250,7.5e6,55875,10e6,74500,12.5e6,93125,15e6,111750,17.5e6,130375,20e6,149000,25e6,186250,30e6,223500,35e6,260750,40e6,298000,45e6,335250,50e6,372500,55e6,409750,60e6,447000], 46:[5e6,38500,7.5e6,57750,10e6,77000,12.5e6,96250,15e6,115500,17.5e6,134750,20e6,154000,25e6,192500,30e6,231000,35e6,269500,40e6,308000,45e6,346500,50e6,385000,55e6,423500,60e6,462000], 56:[5e6,40750,7.5e6,61125,10e6,81500,12.5e6,101875,15e6,122250,17.5e6,142625,20e6,163000,25e6,203750,30e6,244500,35e6,285250,40e6,326000,45e6,366750,50e6,407500,55e6,448250,60e6,489000]};
const LP_NO_T15 = {18:[5e6,28250,7.5e6,42375,10e6,56500,12.5e6,70625,15e6,84750,17.5e6,98875,20e6,113000,25e6,141250,30e6,169500,35e6,197750,40e6,226000,45e6,254250,50e6,282500,55e6,310750,60e6,339000], 46:[5e6,30000,7.5e6,45000,10e6,60000,12.5e6,75000,15e6,90000,17.5e6,105000,20e6,120000,25e6,150000,30e6,180000,35e6,210000,40e6,240000,45e6,270000,50e6,300000,55e6,330000,60e6,360000], 56:[5e6,32750,7.5e6,49125,10e6,65500,12.5e6,81875,15e6,98250,17.5e6,114625,20e6,131000,25e6,163750,30e6,196500,35e6,229250,40e6,262000,45e6,294750,50e6,327500,55e6,360250,60e6,393000]};
// ── Life Plan – With Cash Back ────────────────────────────────────────────────
const LP_CB_T5  = {18:[10e6,217455,12.5e6,271818.75,15e6,326182.5,17.5e6,380546.25,20e6,434910,25e6,543637.5,30e6,652365,35e6,761092.5,40e6,869820,45e6,978547.5,50e6,1087275,55e6,1196002.5,60e6,1304730], 46:[10e6,218545,12.5e6,273181.25,15e6,327817.5,17.5e6,382453.75,20e6,437090,25e6,546362.5,30e6,655635,35e6,764907.5,40e6,874180,45e6,983452.5,50e6,1092725,55e6,1201997.5,60e6,1311270], 56:[10e6,219635,12.5e6,274543.75,15e6,329452.5,17.5e6,384361.25,20e6,439270,25e6,549087.5,30e6,658905,35e6,768722.5,40e6,878540,45e6,988357.5,50e6,1098175,55e6,1207992.5,60e6,1317810]};
const LP_CB_T7  = {18:[10e6,157000,12.5e6,196250,15e6,235500,17.5e6,274750,20e6,314000,25e6,392500,30e6,471000,35e6,549500,40e6,628000,45e6,706500,50e6,785000,55e6,863500,60e6,942000], 46:[10e6,159000,12.5e6,198750,15e6,238500,17.5e6,278250,20e6,318000,25e6,397500,30e6,477000,35e6,556500,40e6,636000,45e6,715500,50e6,795000,55e6,874500,60e6,954000], 56:[10e6,160500,12.5e6,200625,15e6,240750,17.5e6,280875,20e6,321000,25e6,401250,30e6,481500,35e6,561750,40e6,642000,45e6,722250,50e6,802500,55e6,882750,60e6,963000]};
const LP_CB_T10 = {18:[10e6,124500,12.5e6,155625,15e6,186750,17.5e6,217875,20e6,249000,25e6,311250,30e6,373500,35e6,435750,40e6,498000,45e6,560250,50e6,622500,55e6,684750,60e6,747000], 46:[10e6,127500,12.5e6,159375,15e6,191250,17.5e6,223125,20e6,255000,25e6,318750,30e6,382500,35e6,446250,40e6,510000,45e6,573750,50e6,637500,55e6,701250,60e6,765000], 56:[10e6,129500,12.5e6,161875,15e6,194250,17.5e6,226625,20e6,259000,25e6,323750,30e6,388500,35e6,453250,40e6,518000,45e6,582750,50e6,647500,55e6,712250,60e6,777000]};
const LP_CB_T12 = {18:[5e6,51000,7.5e6,76500,10e6,102000,12.5e6,127500,15e6,153000,17.5e6,178500,20e6,204000,25e6,255000,30e6,306000,35e6,357000,40e6,408000,45e6,459000,50e6,510000,55e6,561000,60e6,612000], 46:[5e6,52500,7.5e6,78750,10e6,105000,12.5e6,131250,15e6,157500,17.5e6,183750,20e6,210000,25e6,262500,30e6,315000,35e6,367500,40e6,420000,45e6,472500,50e6,525000,55e6,577500,60e6,630000], 56:[5e6,54500,7.5e6,81750,10e6,109000,12.5e6,136250,15e6,163500,17.5e6,190750,20e6,218000,25e6,272500,30e6,327000,35e6,381500,40e6,436000,45e6,490500,50e6,545000,55e6,599500,60e6,654000]};
const LP_CB_T15 = {18:[5e6,39000,7.5e6,58500,10e6,78000,12.5e6,97500,15e6,117000,17.5e6,136500,20e6,156000,25e6,195000,30e6,234000,35e6,273000,40e6,312000,45e6,351000,50e6,390000,55e6,429000,60e6,468000], 46:[5e6,41000,7.5e6,61500,10e6,82000,12.5e6,102500,15e6,123000,17.5e6,143500,20e6,164000,25e6,205000,30e6,246000,35e6,287000,40e6,328000,45e6,369000,50e6,410000,55e6,451000,60e6,492000], 56:[5e6,43500,7.5e6,65250,10e6,87000,12.5e6,108750,15e6,130500,17.5e6,152250,20e6,174000,25e6,217500,30e6,261000,35e6,304500,40e6,348000,45e6,391500,50e6,435000,55e6,478500,60e6,522000]};
// ── Education Plan – No Cash Back ─────────────────────────────────────────────
const EP_NO_T5  = {18:[10e6,184210,12.5e6,230262.5,15e6,276315,17.5e6,322367.5,20e6,368420,25e6,460525,30e6,552630,35e6,644735,40e6,736840,45e6,828945,50e6,921050,55e6,1013155,60e6,1105260,65e6,1197365,70e6,1289470,75e6,1381575,80e6,1473680,85e6,1565785,90e6,1657890,95e6,1749995,100e6,1842100], 46:[10e6,187480,12.5e6,234350,15e6,281220,17.5e6,328090,20e6,374960,25e6,468700,30e6,562440,35e6,656180,40e6,749920,45e6,843660,50e6,937400,55e6,1031140,60e6,1124880,65e6,1218620,70e6,1312360,75e6,1406100,80e6,1499840,85e6,1593580,90e6,1687320,95e6,1781060,100e6,1874800], 56:[10e6,189660,12.5e6,237075,15e6,284490,17.5e6,331905,20e6,379320,25e6,474150,30e6,568980,35e6,663810,40e6,758640,45e6,853470,50e6,948300,55e6,1043130,60e6,1137960,65e6,1232790,70e6,1327620,75e6,1422450,80e6,1517280,85e6,1612110,90e6,1706940,95e6,1801770,100e6,1896600]};
const EP_NO_T7  = {18:[10e6,131500,12.5e6,164375,15e6,197250,17.5e6,230125,20e6,263000,25e6,328750,30e6,394500,35e6,460250,40e6,526000,45e6,591750,50e6,657500,55e6,723250,60e6,789000,65e6,854750,70e6,920500,75e6,986250,80e6,1052000,85e6,1117750,90e6,1183500,95e6,1249250,100e6,1315000], 46:[10e6,134500,12.5e6,168125,15e6,201750,17.5e6,235375,20e6,269000,25e6,336250,30e6,403500,35e6,470750,40e6,538000,45e6,605250,50e6,672500,55e6,739750,60e6,807000,65e6,874250,70e6,941500,75e6,1008750,80e6,1076000,85e6,1143250,90e6,1210500,95e6,1277750,100e6,1345000], 56:[10e6,137500,12.5e6,171875,15e6,206250,17.5e6,240625,20e6,275000,25e6,343750,30e6,412500,35e6,481250,40e6,550000,45e6,618750,50e6,687500,55e6,756250,60e6,825000,65e6,893750,70e6,962500,75e6,1031250,80e6,1100000,85e6,1168750,90e6,1237500,95e6,1306250,100e6,1375000]};
const EP_NO_T10 = {18:[10e6,104000,12.5e6,130000,15e6,156000,17.5e6,182000,20e6,208000,25e6,260000,30e6,312000,35e6,364000,40e6,416000,45e6,468000,50e6,520000,55e6,572000,60e6,624000,65e6,676000,70e6,728000,75e6,780000,80e6,832000,85e6,884000,90e6,936000,95e6,988000,100e6,1040000], 46:[10e6,107000,12.5e6,133750,15e6,160500,17.5e6,187250,20e6,214000,25e6,267500,30e6,321000,35e6,374500,40e6,428000,45e6,481500,50e6,535000,55e6,588500,60e6,642000,65e6,695500,70e6,749000,75e6,802500,80e6,856000,85e6,909500,90e6,963000,95e6,1016500,100e6,1070000], 56:[10e6,111000,12.5e6,138750,15e6,166500,17.5e6,194250,20e6,222000,25e6,277500,30e6,333000,35e6,388500,40e6,444000,45e6,499500,50e6,555000,55e6,610500,60e6,666000,65e6,721500,70e6,777000,75e6,832500,80e6,888000,85e6,943500,90e6,999000,95e6,1054500,100e6,1110000]};
const EP_NO_T12 = {18:[5e6,42250,7.5e6,63375,10e6,84500,12.5e6,105625,15e6,126750,17.5e6,147875,20e6,169000,25e6,211250,30e6,253500,35e6,295750,40e6,338000,45e6,380250,50e6,422500,55e6,464750,60e6,507000,65e6,549250,70e6,591500,75e6,633750,80e6,676000,85e6,718250,90e6,760500,95e6,802750,100e6,845000], 46:[5e6,43750,7.5e6,65625,10e6,87500,12.5e6,109375,15e6,131250,17.5e6,153125,20e6,175000,25e6,218750,30e6,262500,35e6,306250,40e6,350000,45e6,393750,50e6,437500,55e6,481250,60e6,525000,65e6,568750,70e6,612500,75e6,656250,80e6,700000,85e6,743750,90e6,787500,95e6,831250,100e6,875000], 56:[5e6,46250,7.5e6,69375,10e6,92500,12.5e6,115625,15e6,138750,17.5e6,161875,20e6,185000,25e6,231250,30e6,277500,35e6,323750,40e6,370000,45e6,416250,50e6,462500,55e6,508750,60e6,555000,65e6,601250,70e6,647500,75e6,693750,80e6,740000,85e6,786250,90e6,832500,95e6,878750,100e6,925000]};
const EP_NO_T15 = {18:[5e6,32500,7.5e6,48750,10e6,65000,12.5e6,81250,15e6,97500,17.5e6,113750,20e6,130000,25e6,162500,30e6,195000,35e6,227500,40e6,260000,45e6,292500,50e6,325000,55e6,357500,60e6,390000,65e6,422500,70e6,455000,75e6,487500,80e6,520000,85e6,552500,90e6,585000,95e6,617500,100e6,650000], 46:[5e6,34250,7.5e6,51375,10e6,68500,12.5e6,85625,15e6,102750,17.5e6,119875,20e6,137000,25e6,171250,30e6,205500,35e6,239750,40e6,274000,45e6,308250,50e6,342500,55e6,376750,60e6,411000,65e6,445250,70e6,479500,75e6,513750,80e6,548000,85e6,582250,90e6,616500,95e6,650750,100e6,685000], 56:[5e6,37250,7.5e6,55875,10e6,74500,12.5e6,93125,15e6,111750,17.5e6,130375,20e6,149000,25e6,186250,30e6,223500,35e6,260750,40e6,298000,45e6,335250,50e6,372500,55e6,409750,60e6,447000,65e6,484250,70e6,521500,75e6,558750,80e6,596000,85e6,633250,90e6,670500,95e6,707750,100e6,745000]};
// ── Education Plan – With Cash Back ──────────────────────────────────────────
const EP_CB_T5  = {18:[10e6,232170,12.5e6,290212.5,15e6,348255,17.5e6,406297.5,20e6,464340,25e6,580425,30e6,696510,35e6,812595,40e6,928680,45e6,1044765,50e6,1160850,55e6,1276935,60e6,1393020,65e6,1509105,70e6,1625190,75e6,1741275,80e6,1857360,85e6,1973445,90e6,2089530,95e6,2205615,100e6,2321700], 46:[10e6,233260,12.5e6,291575,15e6,349890,17.5e6,408205,20e6,466520,25e6,583150,30e6,699780,35e6,816410,40e6,933040,45e6,1049670,50e6,1166300,55e6,1282930,60e6,1399560,65e6,1516190,70e6,1632820,75e6,1749450,80e6,1866080,85e6,1982710,90e6,2099340,95e6,2215970,100e6,2332600], 56:[10e6,238165,12.5e6,297706.25,15e6,357247.5,17.5e6,416788.75,20e6,476330,25e6,595412.5,30e6,714495,35e6,833577.5,40e6,952660,45e6,1071742.5,50e6,1190825,55e6,1309907.5,60e6,1428990,65e6,1548072.5,70e6,1667155,75e6,1786237.5,80e6,1905320,85e6,2024402.5,90e6,2143485,95e6,2262567.5,100e6,2381650]};
const EP_CB_T7  = {18:[10e6,170500,12.5e6,213125,15e6,255750,17.5e6,298375,20e6,341000,25e6,426250,30e6,511500,35e6,596750,40e6,682000,45e6,767250,50e6,852500,55e6,937750,60e6,1023000,65e6,1108250,70e6,1193500,75e6,1278750,80e6,1364000,85e6,1449250,90e6,1534500,95e6,1619750,100e6,1705000], 46:[10e6,172500,12.5e6,215625,15e6,258750,17.5e6,301875,20e6,345000,25e6,431250,30e6,517500,35e6,603750,40e6,690000,45e6,776250,50e6,862500,55e6,948750,60e6,1035000,65e6,1121250,70e6,1207500,75e6,1293750,80e6,1380000,85e6,1466250,90e6,1552500,95e6,1638750,100e6,1725000], 56:[10e6,177500,12.5e6,221875,15e6,266250,17.5e6,310625,20e6,355000,25e6,443750,30e6,532500,35e6,621250,40e6,710000,45e6,798750,50e6,887500,55e6,976250,60e6,1065000,65e6,1153750,70e6,1242500,75e6,1331250,80e6,1420000,85e6,1508750,90e6,1597500,95e6,1686250,100e6,1775000]};
const EP_CB_T10 = {18:[10e6,138000,12.5e6,172500,15e6,207000,17.5e6,241500,20e6,276000,25e6,345000,30e6,414000,35e6,483000,40e6,552000,45e6,621000,50e6,690000,55e6,759000,60e6,828000,65e6,897000,70e6,966000,75e6,1035000,80e6,1104000,85e6,1173000,90e6,1242000,95e6,1311000,100e6,1380000], 46:[10e6,141000,12.5e6,176250,15e6,211500,17.5e6,246750,20e6,282000,25e6,352500,30e6,423000,35e6,493500,40e6,564000,45e6,634500,50e6,705000,55e6,775500,60e6,846000,65e6,916500,70e6,987000,75e6,1057500,80e6,1128000,85e6,1198500,90e6,1269000,95e6,1339500,100e6,1410000], 56:[10e6,146500,12.5e6,183125,15e6,219750,17.5e6,256375,20e6,293000,25e6,366250,30e6,439500,35e6,512750,40e6,586000,45e6,659250,50e6,732500,55e6,805750,60e6,879000,65e6,952250,70e6,1025500,75e6,1098750,80e6,1172000,85e6,1245250,90e6,1318500,95e6,1391750,100e6,1465000]};
const EP_CB_T12 = {18:[5e6,56750,7.5e6,85125,10e6,113500,12.5e6,141875,15e6,170250,17.5e6,198625,20e6,227000,25e6,283750,30e6,340500,35e6,397250,40e6,454000,45e6,510750,50e6,567500,55e6,624250,60e6,681000,65e6,737750,70e6,794500,75e6,851250,80e6,908000,85e6,964750,90e6,1021500,95e6,1078250,100e6,1135000], 46:[5e6,58750,7.5e6,88125,10e6,117500,12.5e6,146875,15e6,176250,17.5e6,205625,20e6,235000,25e6,293750,30e6,352500,35e6,411250,40e6,470000,45e6,528750,50e6,587500,55e6,646250,60e6,705000,65e6,763750,70e6,822500,75e6,881250,80e6,940000,85e6,998750,90e6,1057500,95e6,1116250,100e6,1175000], 56:[5e6,61750,7.5e6,92625,10e6,123500,12.5e6,154375,15e6,185250,17.5e6,216125,20e6,247000,25e6,308750,30e6,370500,35e6,432250,40e6,494000,45e6,555750,50e6,617500,55e6,679250,60e6,741000,65e6,802750,70e6,864500,75e6,926250,80e6,988000,85e6,1049750,90e6,1111500,95e6,1173250,100e6,1235000]};
const EP_CB_T15 = {18:[5e6,43500,7.5e6,65250,10e6,87000,12.5e6,108750,15e6,130500,17.5e6,152250,20e6,174000,25e6,217500,30e6,261000,35e6,304500,40e6,348000,45e6,391500,50e6,435000,55e6,478500,60e6,522000,65e6,565500,70e6,609000,75e6,652500,80e6,696000,85e6,739500,90e6,783000,95e6,826500,100e6,870000], 46:[5e6,45750,7.5e6,68625,10e6,91500,12.5e6,114375,15e6,137250,17.5e6,160125,20e6,183000,25e6,228750,30e6,274500,35e6,320250,40e6,366000,45e6,411750,50e6,457500,55e6,503250,60e6,549000,65e6,594750,70e6,640500,75e6,686250,80e6,732000,85e6,777750,90e6,823500,95e6,869250,100e6,915000], 56:[5e6,49750,7.5e6,74625,10e6,99500,12.5e6,124375,15e6,149250,17.5e6,174125,20e6,199000,25e6,248750,30e6,298500,35e6,348250,40e6,398000,45e6,447750,50e6,497500,55e6,547250,60e6,597000,65e6,646750,70e6,696500,75e6,746250,80e6,796000,85e6,845750,90e6,895500,95e6,945250,100e6,995000]};

function registerPlan(planKey, tMap) {
  for (const [term, bMap] of Object.entries(tMap)) {
    for (const [bracketAge, arr] of Object.entries(bMap)) {
      for (let i = 0; i < arr.length; i += 2) {
        addRate(planKey, parseInt(term), parseInt(bracketAge), arr[i], arr[i+1]);
      }
    }
  }
}
registerPlan("Life Plan- No cash back",         {5:LP_NO_T5,7:LP_NO_T7,10:LP_NO_T10,12:LP_NO_T12,15:LP_NO_T15});
registerPlan("Life Plan- With cash back",       {5:LP_CB_T5,7:LP_CB_T7,10:LP_CB_T10,12:LP_CB_T12,15:LP_CB_T15});
registerPlan("Education Plan- No cash back",    {5:EP_NO_T5,7:EP_NO_T7,10:EP_NO_T10,12:EP_NO_T12,15:EP_NO_T15});
registerPlan("Education Plan- With cash back",  {5:EP_CB_T5,7:EP_CB_T7,10:EP_CB_T10,12:EP_CB_T12,15:EP_CB_T15});

// ── WOP Rates ─────────────────────────────────────────────────────────────────
const WOP = {18:[.016,.025,.04,.049,.063],19:[.019,.029,.044,.054,.069],20:[.021,.031,.047,.058,.072],21:[.023,.034,.051,.061,.077],22:[.025,.036,.053,.064,.08],23:[.026,.037,.055,.066,.082],24:[.026,.038,.056,.068,.084],25:[.026,.038,.057,.069,.085],26:[.027,.039,.058,.07,.087],27:[.028,.04,.06,.072,.09],28:[.029,.042,.062,.074,.092],29:[.03,.043,.063,.076,.094],30:[.031,.044,.065,.078,.096],31:[.032,.046,.067,.08,.098],32:[.032,.047,.068,.081,.099],33:[.033,.047,.069,.082,.1],34:[.033,.048,.069,.083,.101],35:[.034,.048,.07,.083,.102],36:[.034,.048,.07,.084,.103],37:[.034,.049,.07,.084,.103],38:[.034,.049,.071,.085,.104],39:[.034,.049,.071,.085,.105],40:[.034,.049,.071,.086,.107],41:[.035,.049,.072,.087,.109],42:[.035,.05,.073,.089,.112],43:[.035,.05,.074,.091,.115],44:[.035,.051,.076,.094,.12],45:[.036,.052,.079,.097,.125],46:[.037,.054,.082,.102,.131],47:[.038,.057,.087,.108,.14],48:[.041,.06,.092,.115,.149],49:[.043,.064,.098,.123,.16],50:[.046,.069,.106,.132,.172],51:[.049,.074,.114,.142,.185],52:[.053,.079,.123,.153,.2],53:[.057,.085,.132,.166,.216],54:[.062,.092,.143,.179,.234],55:[.067,.1,.155,.194,.253],56:[.072,.108,.168,.21,null],57:[.078,.117,.182,.228,null],58:[.085,.127,.198,.247,null],59:[.092,.138,.215,null,null],60:[.1,.15,.233,null,null]};
const TERM_IDX = {5:0,7:1,10:2,12:3,15:4};

// ── State ─────────────────────────────────────────────────────────────────────
let payMode = 'monthly';
const MODE_FACTORS = {monthly:1, quarterly:3, semi:6, annual:12};
let lastQuoteData = null;

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
  placeholderOption.disabled = true;
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

function bindUiEventHandlers() {
  document.querySelectorAll('.seg-btn[data-mode]').forEach((btn) => {
    btn.addEventListener('click', function () {
      const mode = this.getAttribute('data-mode');
      if (mode) setMode(mode, this);
    });
  });

  const cashbackToggle = document.getElementById('cashbackToggle');
  if (cashbackToggle) cashbackToggle.addEventListener('change', syncCashback);

  const calcBtn = document.getElementById('calculateBtn');
  if (calcBtn) calcBtn.addEventListener('click', calculate);

  const pdfBtn = document.getElementById('downloadPdf');
  if (pdfBtn) pdfBtn.addEventListener('click', downloadPdf);

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

    // disable/enable options
    [...termEl.options].forEach(opt => {
      const v = parseInt(opt.value);
      opt.disabled = !allowed.includes(v);
    });

    // if current value is not allowed, pick the largest allowed option
    if (allowed.length > 0) {
      if (!allowed.includes(parseInt(termEl.value))) {
        // choose the largest allowed term (most coverage)
        termEl.value = String(Math.max(...allowed));
      }
    } else {
      // no allowed terms for this age — disable all and leave selection as-is
      // UI-level guidance will be provided by validation when attempting to calculate
    }
  }
}

document.getElementById('plan').addEventListener('change', updatePlanUI);
document.getElementById('term').addEventListener('change', updatePlanUI);
// refresh UI when age input changes too (so terms update immediately)
const ageInputEl = document.getElementById('age');
if (ageInputEl) ageInputEl.addEventListener('input', updatePlanUI);
// initialise state on load
updatePlanUI();
bindUiEventHandlers();

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
  pdfFailed: 'Failed to generate PDF. Please try again.'
};

function getPlanType(planName) {
  if (planName.includes('Education Plan')) return 'Education Plan';
  if (planName.includes('Life Plus')) return 'Life Plus';
  return 'Life Plan';
}

function lookupRevRate(termYears, planType) {
  // Life Plan / Life Plus = 3.00%, Education Plan = 4.20%
  return planType === 'Education Plan' ? 0.042 : 0.03;
}

function lookupTerminalRate(termYears, planType) {
  // All plans and terms = 50%
  return 0.5;
}

function lookupCashbackCount(termYears) {
  const map = {5:1, 7:2, 10:3, 12:4, 15:5};
  return map[termYears] || 0;
}

function computeBonuses(planName, termYears, sumAssured, premiumForCashback) {
  const planType = getPlanType(planName);
  const revRate = lookupRevRate(termYears, planType);
  const totalRevBonus = revRate * termYears * sumAssured;

  const termRate = lookupTerminalRate(termYears, planType);
  const totalTermBonus = termRate * totalRevBonus;

  const hasCashback = planName.endsWith('With cash back');
  const roundedPremiumForCashback = Math.round(premiumForCashback);
  const singleCashback = hasCashback ? 10 * roundedPremiumForCashback : 0;
  const cashbackCount = lookupCashbackCount(termYears);
  const totalCashback = cashbackCount * singleCashback;

  const maturityValue = sumAssured + totalRevBonus + totalTermBonus + totalCashback;

  return {
    totalRevBonus,
    totalTermBonus,
    singleCashback,
    totalCashback,
    maturityValue,
    cashbackCount
  };
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

  errDiv.style.display = 'none';
  // hide download link until a fresh result is ready
  if (pdfBtn) pdfBtn.style.display = 'none';

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
  const roundedPeriodPremium = Math.round(periodPremium);
  // Cashback = 10× monthly premium, paid every 36 contributions within policy term
  const policyEndMonth = term * 12;
  const cashbackMonths = [36, 72, 108, 144, 180].filter(m => m <= policyEndMonth);
  const numPayouts = cashbackMonths.length;
  const cashbackAmt = hasCashback ? roundedPeriodPremium * 10 : 0;
  const totalCashback = hasCashback ? cashbackAmt * numPayouts : 0;
  const totalPremiumsTerm = monthlyTotal * 12 * term;
  const modeLabel = modeLabels[payMode];
  const modePremiumLabel = `Total ${modeLabel} Premium`;
  const bonusResult = computeBonuses(plan, term, sa, periodPremium);
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
      if (checkPdfAvailability()) pdfBtn.style.display = 'block';
      else pdfBtn.style.display = 'none';
    } catch (e) { pdfBtn.style.display = 'none'; }
  }

  // assembly of result markup is mostly fixed values; name has already been escaped
  contentDiv.innerHTML = `
    <div class="result-wrapper">
      <div class="result-hero">
        <div class="geo"></div>
        ${name ? `<div class="for-name">Prepared for ${name}</div>` : ''}
        <div class="result-mode-lbl">${modePremiumLabel}</div>
        <div class="result-amount">
          <span class="result-amount-currency">TZS</span>${fmtNum(periodPremium)}
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
          <div class="bc-val">TZS ${fmtNum(basePremium)}</div>
        </div>
        <div class="breakdown-cell">
          <div class="bc-lbl">Annual Premium</div>
          <div class="bc-val">TZS ${fmtNum(annualPremium)}</div>
        </div>
        ${wop ? `
        <div class="breakdown-cell">
          <div class="bc-lbl">WOP Rider Premium</div>
          <div class="bc-val">TZS ${fmtNum(wopAddon)}</div>
        </div>` : ''}
        <div class="breakdown-cell">
          <div class="bc-lbl">Premium Payable (${term} Years)</div>
          <div class="bc-val">TZS ${fmtNum(totalPremiumsTerm)}</div>
        </div>
        <div class="breakdown-cell">
          <div class="bc-lbl">Plan</div>
          <div class="bc-val">${plan}</div>
        </div>
        <div class="breakdown-cell">
          <div class="bc-lbl">Sum Assured</div>
          <div class="bc-val">TZS ${fmtNum(sa)}</div>
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
        <div class="cb-sub">Each payout = 10× the monthly premium of TZS ${fmtNum(roundedPeriodPremium)}</div>
      </div>
    </div>` : ''}
  `;

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

