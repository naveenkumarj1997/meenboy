const ORDER_CATEGORY_GROUPS = [
  {
    id: "fish_seafood",
    label: "Fish & Seafood",
    categories: ["Fish", "Seafood"]
  },
  {
    id: "chicken_country_chicken",
    label: "Chicken & Country Chicken",
    categories: ["Chicken", "Country Chicken"]
  },
  {
    id: "mutton",
    label: "Mutton",
    categories: ["Mutton"]
  }
];

const normalizeGroupId = (groupId) => {
  const value = String(groupId || "").trim().toLowerCase();
  const aliases = {
    fish: "fish_seafood",
    seafood: "fish_seafood",
    "fish & seafood": "fish_seafood",
    chicken: "chicken_country_chicken",
    "country chicken": "chicken_country_chicken",
    "chicken & country chicken": "chicken_country_chicken"
  };
  return aliases[value] || value;
};

const getOrderCategoryGroup = (groupId) => {
  const id = normalizeGroupId(groupId);
  return ORDER_CATEGORY_GROUPS.find((g) => g.id === id) || null;
};

const productCategoryMatchesGroup = (productCategory, group) => {
  if (!group) return false;
  return group.categories.includes(productCategory);
};

module.exports = {
  ORDER_CATEGORY_GROUPS,
  normalizeGroupId,
  getOrderCategoryGroup,
  productCategoryMatchesGroup
};
