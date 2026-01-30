// --- CONFIG ---
const API_KEY = "1"; // TheMealDB test key
const BASE_URL = `https://www.themealdb.com/api/json/v1/${API_KEY}`;

// --- DOM ---
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const resultsEl = document.getElementById("results");

// --- EVENTS ---
searchBtn.addEventListener("click", () => {
  const q = searchInput.value.trim();
  if (!q) return;
  searchMeals(q);
});

searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") searchBtn.click();
});

// --- API ---
async function searchMeals(query) {
  resultsEl.innerHTML = "<p>Buscando…</p>";
  try {
    const res = await fetch(`${BASE_URL}/search.php?s=${encodeURIComponent(query)}`);
    const data = await res.json();
    renderMeals(data.meals || []);
  } catch (err) {
    resultsEl.innerHTML = "<p>Error al buscar recetas</p>";
    console.error(err);
  }
}

// --- RENDER ---
function renderMeals(meals) {
  if (!meals.length) {
    resultsEl.innerHTML = "<p>No se han encontrado recetas</p>";
    return;
  }

  resultsEl.innerHTML = "";

  meals.forEach(meal => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <img src="${meal.strMealThumb}" alt="${meal.strMeal}">
      <div class="content">
        <h3>${meal.strMeal}</h3>
        <button>Importar</button>
      </div>
    `;

    card.querySelector("button").addEventListener("click", () => {
      importMeal(meal);
    });

    resultsEl.appendChild(card);
  });
}

// --- IMPORT (placeholder) ---
function importMeal(meal) {
  const ingredients = extractIngredients(meal);

  const importedMeal = {
    name: meal.strMeal,
    source: "TheMealDB",
    ingredients,
    instructions: meal.strInstructions,
    tags: [],
    tupper: false,
    congelable: false
  };

  console.log("Receta importada:", importedMeal);
  alert("Receta lista para importar (mira la consola)");
}

// --- HELPERS ---
function extractIngredients(meal) {
  const list = [];
  for (let i = 1; i <= 20; i++) {
    const ing = meal[`strIngredient${i}`];
    const mea = meal[`strMeasure${i}`];
    if (ing && ing.trim()) {
      list.push({
        name: ing.trim(),
        measure: (mea || "").trim()
      });
    }
  }
  return list;
}
