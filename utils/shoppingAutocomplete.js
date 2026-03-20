import { normalizeText } from "./normalizeText.js";

function upsertCatalogEntry(map, ingredient, fallbackResolveCategory) {
  const label = ingredient?.label?.trim?.() ?? "";
  const normalizedLabel = normalizeText(label);
  if (!normalizedLabel) return;

  const existing = map.get(normalizedLabel) || {
    label,
    normalizedLabel,
    categoryId: "",
    usageCount: 0,
    lastUsedAt: 0
  };

  const nextCategoryId =
    ingredient?.categoryId ||
    existing.categoryId ||
    fallbackResolveCategory(label) ||
    "otros";
  const usageCount = Math.max(0, Number(ingredient?.usageCount) || 0);
  const lastUsedAt = Math.max(0, Number(ingredient?.lastUsedAt) || 0);

  map.set(normalizedLabel, {
    label: existing.label.length >= label.length ? existing.label : label,
    normalizedLabel,
    categoryId: nextCategoryId,
    usageCount: existing.usageCount + usageCount,
    lastUsedAt: Math.max(existing.lastUsedAt, lastUsedAt)
  });
}

export function buildIngredientCatalog({
  shoppingSuggestions = [],
  shoppingItems = [],
  recipes = [],
  customCategories = {},
  resolveCategory = () => "otros"
} = {}) {
  const catalog = new Map();
  const fallbackResolveCategory = (label) => {
    const customCategory = customCategories[normalizeText(label)];
    return customCategory || resolveCategory(label) || "otros";
  };

  shoppingSuggestions.forEach((suggestion) => {
    upsertCatalogEntry(
      catalog,
      {
        label: suggestion?.label,
        categoryId: fallbackResolveCategory(suggestion?.label ?? ""),
        usageCount: Math.max(1, Number(suggestion?.count) || 0),
        lastUsedAt: Number(suggestion?.lastAdded) || 0
      },
      fallbackResolveCategory
    );
  });

  shoppingItems.forEach((item) => {
    upsertCatalogEntry(
      catalog,
      {
        label: item?.label,
        categoryId: item?.categoryId || fallbackResolveCategory(item?.label ?? ""),
        usageCount: 1,
        lastUsedAt: Number(item?.createdAt) || 0
      },
      fallbackResolveCategory
    );
  });

  recipes.forEach((recipe) => {
    recipe?.ingredients?.forEach?.((ingredient) => {
      upsertCatalogEntry(
        catalog,
        {
          label: ingredient?.label,
          categoryId: ingredient?.categoryId || fallbackResolveCategory(ingredient?.label ?? ""),
          usageCount: 1,
          lastUsedAt: 0
        },
        fallbackResolveCategory
      );
    });
  });

  return Array.from(catalog.values());
}

function getQueryMatchScore(label, query) {
  if (!query) return 0;
  if (label === query) return 160;
  if (label.startsWith(query)) return 120;

  const words = label.split(" ");
  if (words.some((word) => word.startsWith(query))) return 95;
  if (label.includes(query)) return 70;
  return -1;
}

function getRecencyScore(lastUsedAt) {
  if (!lastUsedAt) return 0;
  const ageDays = Math.max(0, Date.now() - lastUsedAt) / (1000 * 60 * 60 * 24);
  return Math.max(0, 20 - ageDays * 0.8);
}

export function getMatchingIngredientSuggestions({
  query = "",
  catalog = [],
  excludedLabels = new Set(),
  limit = 6
} = {}) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return [];

  return catalog
    .filter((ingredient) => ingredient?.normalizedLabel && !excludedLabels.has(ingredient.normalizedLabel))
    .map((ingredient) => {
      const matchScore = getQueryMatchScore(ingredient.normalizedLabel, normalizedQuery);
      if (matchScore < 0) return null;
      const frequencyScore = Math.min(ingredient.usageCount || 0, 8) * 4;
      const recencyScore = getRecencyScore(ingredient.lastUsedAt);
      const lengthPenalty = Math.max(0, ingredient.normalizedLabel.length - normalizedQuery.length) * 0.18;
      return {
        ...ingredient,
        score: matchScore + frequencyScore + recencyScore - lengthPenalty
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (right.usageCount !== left.usageCount) return right.usageCount - left.usageCount;
      if (right.lastUsedAt !== left.lastUsedAt) return right.lastUsedAt - left.lastUsedAt;
      return left.label.localeCompare(right.label, "es");
    })
    .slice(0, Math.max(1, limit));
}
