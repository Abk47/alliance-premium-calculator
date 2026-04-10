(function bootstrapCalculatorApp() {
  if (window.CalculatorApp && typeof window.CalculatorApp.init === 'function') {
    window.CalculatorApp.init();
  } else {
    console.error('CalculatorApp module failed to load.');
  }

  // Dismiss splash loader now that all modules have loaded and app is initialised
  const loader = document.getElementById('splashLoader');
  if (loader) {
    loader.classList.add('splash-hide');
    setTimeout(function () { loader.style.display = 'none'; }, 480);
  }
})();
