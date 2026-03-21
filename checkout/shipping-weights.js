window.AXIOM_SHIPPING_WEIGHTS = (function () {
  const PEPTIDE_VIAL_OZ = 3;
  const BAC_WATER_OZ = 6;

  const PEPTIDE_VIAL_LBS = PEPTIDE_VIAL_OZ / 16;
  const BAC_WATER_LBS = BAC_WATER_OZ / 16;

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

  function getPerItemWeightOz(item) {
    const explicitOz = item?.weight_oz ?? item?.weightOz;
    if (explicitOz !== undefined && explicitOz !== null && explicitOz !== "") {
      return toNumber(explicitOz, 0);
    }

    const explicitLbs = item?.weight_lbs ?? item?.weightLbs;
    if (explicitLbs !== undefined && explicitLbs !== null && explicitLbs !== "") {
      return toNumber(explicitLbs, 0) * 16;
    }

    return isBacWaterItem(item) ? BAC_WATER_OZ : PEPTIDE_VIAL_OZ;
  }

  function getPerItemWeightLbs(item) {
    return getPerItemWeightOz(item) / 16;
  }

  function getLineWeightOz(item) {
    return getPerItemWeightOz(item) * getItemQuantity(item);
  }

  function getLineWeightLbs(item) {
    return getLineWeightOz(item) / 16;
  }

  function getTotalWeightOz(items) {
    if (!Array.isArray(items)) return 0;

    return items.reduce(function (sum, item) {
      return sum + getLineWeightOz(item);
    }, 0);
  }

  function getTotalWeightLbs(items) {
    return getTotalWeightOz(items) / 16;
  }

  function getTotalItemCount(items) {
    if (!Array.isArray(items)) return 0;

    return items.reduce(function (sum, item) {
      return sum + getItemQuantity(item);
    }, 0);
  }

  function enrichCartItemsWithWeights(items) {
    if (!Array.isArray(items)) return [];

    return items.map(function (item) {
      const perItemWeightOz = getPerItemWeightOz(item);
      const perItemWeightLbs = perItemWeightOz / 16;
      const lineWeightOz = getLineWeightOz(item);
      const lineWeightLbs = lineWeightOz / 16;

      return {
        ...item,
        weight_oz: perItemWeightOz,
        weightOz: perItemWeightOz,
        weight_lbs: perItemWeightLbs,
        weightLbs: perItemWeightLbs,
        line_weight_oz: lineWeightOz,
        line_weight_lbs: lineWeightLbs
      };
    });
  }

  return {
    PEPTIDE_VIAL_OZ,
    BAC_WATER_OZ,
    PEPTIDE_VIAL_LBS,
    BAC_WATER_LBS,
    isBacWaterItem,
    getItemQuantity,
    getPerItemWeightOz,
    getPerItemWeightLbs,
    getLineWeightOz,
    getLineWeightLbs,
    getTotalWeightOz,
    getTotalWeightLbs,
    getTotalItemCount,
    enrichCartItemsWithWeights
  };
})();
