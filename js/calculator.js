(function bootstrapCalculatorApp() {
  if (window.CalculatorApp && typeof window.CalculatorApp.init === 'function') {
    window.CalculatorApp.init();
  } else {
    console.error('CalculatorApp module failed to load.');
  }
})();
