// points config, kept here so admin-configurable values are in one place.
// in a bigger version this would live in a Settings collection, keeping it simple for now.
const POINTS_PER_KG = {
  RECYCLABLE: Number(process.env.POINTS_PER_KG_RECYCLABLE) || 10,
  ORGANIC: Number(process.env.POINTS_PER_KG_ORGANIC) || 5,
  MIXED: Number(process.env.POINTS_PER_KG_MIXED) || 2,
};

const RECYCLABLE_CATEGORIES = ["PLASTIC", "PAPER", "GLASS", "METAL", "E_WASTE", "DRY_WASTE"];
const ORGANIC_CATEGORIES = ["WET_WASTE", "ORGANIC_WASTE"];

// picks a rate based on the categories selected for the booking.
// if the booking has a mix of recyclable + organic, we go with the recyclable rate
// since that's the more valuable material - keeps it predictable instead of averaging.
function calculatePoints(actualWeight, categories = []) {
  if (!actualWeight || actualWeight <= 0) return 0;

  const hasRecyclable = categories.some((c) => RECYCLABLE_CATEGORIES.includes(c));
  const hasOrganic = categories.some((c) => ORGANIC_CATEGORIES.includes(c));

  let rate = POINTS_PER_KG.MIXED;
  if (hasRecyclable) rate = POINTS_PER_KG.RECYCLABLE;
  else if (hasOrganic) rate = POINTS_PER_KG.ORGANIC;

  return Math.round(actualWeight * rate);
}

module.exports = { calculatePoints, POINTS_PER_KG };
