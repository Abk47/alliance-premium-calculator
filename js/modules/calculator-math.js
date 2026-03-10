(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }

  root.CalculatorMath = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function getPlanType(planName) {
    if (String(planName || '').includes('Education Plan')) return 'Education Plan';
    if (String(planName || '').includes('Life Plus')) return 'Life Plus';
    return 'Life Plan';
  }

  function lookupRevRate(termYears, planType) {
    return planType === 'Education Plan' ? 0.042 : 0.03;
  }

  function lookupTerminalRate(termYears, planType) {
    return 0.5;
  }

  function lookupCashbackCount(termYears) {
    const map = { 5: 1, 7: 2, 10: 3, 12: 4, 15: 5 };
    return map[termYears] || 0;
  }

  function computeBonuses(planName, termYears, sumAssured, monthlyPremiumForCashback) {
    const planType = getPlanType(planName);
    const revRate = lookupRevRate(termYears, planType);
    const totalRevBonus = revRate * termYears * sumAssured;

    const termRate = lookupTerminalRate(termYears, planType);
    const totalTermBonus = termRate * totalRevBonus;

    const hasCashback = String(planName || '').endsWith('With cash back');
    const roundedPremiumForCashback = Math.round(monthlyPremiumForCashback);
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

  return {
    getPlanType,
    lookupRevRate,
    lookupTerminalRate,
    lookupCashbackCount,
    computeBonuses
  };
});
