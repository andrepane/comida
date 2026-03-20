import test from "node:test";
import assert from "node:assert/strict";

import {
  buildIngredientCatalog,
  getMatchingIngredientSuggestions
} from "../utils/shoppingAutocomplete.js";

test("combina ingredientes guardados de sugerencias, compra y recetas", () => {
  const catalog = buildIngredientCatalog({
    shoppingSuggestions: [{ label: "Tomate", count: 4, lastAdded: 200 }],
    shoppingItems: [{ label: "Tomate", categoryId: "fruta-verdura", createdAt: 120 }],
    recipes: [{ ingredients: [{ label: "Tomate", categoryId: "fruta-verdura" }] }],
    resolveCategory: () => "otros"
  });

  assert.equal(catalog.length, 1);
  assert.equal(catalog[0].label, "Tomate");
  assert.equal(catalog[0].categoryId, "fruta-verdura");
  assert.equal(catalog[0].usageCount, 6);
  assert.equal(catalog[0].lastUsedAt, 200);
});

test("prioriza coincidencias por prefijo y excluye ingredientes ya añadidos", () => {
  const catalog = buildIngredientCatalog({
    shoppingSuggestions: [
      { label: "Tomate pera", count: 5, lastAdded: Date.now() },
      { label: "Patata", count: 2, lastAdded: Date.now() - 10_000 },
      { label: "Aguacate", count: 3, lastAdded: Date.now() - 20_000 }
    ],
    resolveCategory: () => "fruta-verdura"
  });

  const matches = getMatchingIngredientSuggestions({
    query: "to",
    catalog,
    excludedLabels: new Set(["patata"])
  });

  assert.equal(matches[0].label, "Tomate pera");
  assert.equal(matches.some((item) => item.label === "Patata"), false);
});

test("encuentra coincidencias por palabras internas", () => {
  const matches = getMatchingIngredientSuggestions({
    query: "ne",
    catalog: [
      { label: "Carne picada", normalizedLabel: "carne picada", categoryId: "carne", usageCount: 1, lastUsedAt: 0 },
      { label: "Leche", normalizedLabel: "leche", categoryId: "lacteos", usageCount: 1, lastUsedAt: 0 }
    ]
  });

  assert.equal(matches[0].label, "Carne picada");
});

test("incluye ingredientes guardados al menos una vez desde recetas", () => {
  const catalog = buildIngredientCatalog({
    recipes: [
      { ingredients: [{ label: "Calabacín", categoryId: "fruta-verdura" }] },
      { ingredients: [{ label: "Calabacín", categoryId: "fruta-verdura" }, { label: "Arroz", categoryId: "hidratos" }] }
    ],
    resolveCategory: () => "otros"
  });

  const labels = catalog.map((item) => item.label).sort((a, b) => a.localeCompare(b, "es"));

  assert.deepEqual(labels, ["Arroz", "Calabacín"]);
  assert.equal(catalog.find((item) => item.label === "Calabacín")?.usageCount, 2);
});
