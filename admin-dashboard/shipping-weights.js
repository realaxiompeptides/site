window.AXIOM_SHIPPING_WEIGHTS = (function () {
  const PEPTIDE_VIAL_LBS = 0.188;
  const BAC_WATER_LBS = 0.6;

  function toNumber(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function normalizeText(value) {
    return String(value || "").trim().toLowerCase();
  }

  function isBacWaterItem(item) {
    const id = normalizeText(item?.id);
    const slug = normalizeText(item?.slug);
    const name = normalizeText(item?.name || item?.product_name);

    return (
      id.includes("bac") ||
      id.includes("bacteriostatic") ||
      slug.includes("bac") ||
      slug.includes("bacteriostatic") ||
      name.includes("bac water") ||
      name.includes("bacteriostatic water") ||
      name.includes("aa water")
    );
  }

  function getItemQuantity(item) {
    return toNumber(item?.quantity ?? item?.qty ?? 1, 1);
  }

  function getPerItemWeightLbs(item) {
    const explicitLbs = item?.weight_lbs ?? item?.weightLbs;
    if (explicitLbs !== undefined && explicitLbs !== null && explicitLbs !== "") {
      return toNumber(explicitLbs, 0);
    }

    const explicitOz = item?.weight_oz ?? item?.weightOz;
    if (explicitOz !== undefined && explicitOz !== null && explicitOz !== "") {
      return toNumber(explicitOz, 0) / 16;
    }

    return isBacWaterItem(item) ? BAC_WATER_LBS : PEPTIDE_VIAL_LBS;
  }

  function getLineWeightLbs(item) {
    return getPerItemWeightLbs(item) * getItemQuantity(item);
  }

  function getTotalWeightLbs(items) {
    if (!Array.isArray(items)) return 0;

    return items.reduce((sum, item) => {
      return sum + getLineWeightLbs(item);
    }, 0);
  }

  function getTotalWeightOz(items) {
    return getTotalWeightLbs(items) * 16;
  }

  function enrichCartItemsWithWeights(items) {
    if (!Array.isArray(items)) return [];

    return items.map((item) => {
      const perItemWeightLbs = getPerItemWeightLbs(item);
      const lineWeightLbs = getLineWeightLbs(item);

      return {
        ...item,
        weight_lbs: perItemWeightLbs,
        weight_oz: perItemWeightLbs * 16,
        line_weight_lbs: lineWeightLbs,
        line_weight_oz: lineWeightLbs * 16
      };
    });
  }

  return {
    PEPTIDE_VIAL_LBS,
    BAC_WATER_LBS,
    isBacWaterItem,
    getPerItemWeightLbs,
    getLineWeightLbs,
    getTotalWeightLbs,
    getTotalWeightOz,
    enrichCartItemsWithWeights
  };
})();
