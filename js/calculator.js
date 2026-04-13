(function bootstrapCalculatorApp() {
  if (window.CalculatorApp && typeof window.CalculatorApp.init === 'function') {
    window.CalculatorApp.init();
  } else {
    console.error('CalculatorApp module failed to load.');
  }

  // Dynamic copyright year in footer
  const yearEl = document.getElementById('footerYear');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Dismiss splash loader now that all modules have loaded and app is initialised
  const loader = document.getElementById('splashLoader');
  if (loader) {
    loader.classList.add('splash-hide');
    setTimeout(function () { loader.style.display = 'none'; }, 480);
  }
})();
