/***********************
 * Tuppería (v2)
 * - Calendario de 2 semanas (almuerzo/cena)
 * - Recetas sugeridas con filtros (saludable, thermomix, congelable, tupper)
 * - Recetas guardadas con filtro
 * - Lista de la compra con categorías y sugerencias
 ************************/

const LS = {
  RECIPES: "mp_recipes_v2",
  PLAN: "mp_plan_v2",
  SHOP_ITEMS: "mp_shop_items_v2",
  CLIENT_ID: "mp_client_id_v2",
  LAST_UPDATED: "mp_last_updated_v2"
};

const DAYS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const TAG_LABELS = {
  saludable: "Saludable",
  thermomix: "Thermomix",
  congelable: "Congelable",
  tupper: "Tupper",
  rapida: "Rápida",
  alta_proteina: "Alta proteína",
  vegetariana: "Vegetariana"
};

const META_DEFAULTS = {
  protein: "desconocido",
  base: "desconocido",
  technique: "desconocido"
};

const CATEGORY_LABELS = {
  verdura: "Verdura",
  fruta: "Fruta",
  carne: "Carne",
  pescado: "Pescado",
  lacteos: "Lácteos",
  despensa: "Despensa",
  congelados: "Congelados",
  bebidas: "Bebidas",
  limpieza: "Limpieza",
  otros: "Otros"
};

const SUGGESTED_RECIPES = [
  {
    name: "Bowl de quinoa con verduras asadas",
    tags: ["saludable", "tupper"],
    source: "Just Eat / Ideas saludables",
    url: "https://www.just-eat.es/",
    ingredients: ["quinoa", "calabacín", "pimiento", "cebolla", "aceite de oliva"]
  },
  {
    name: "Lentejas estofadas con verduras",
    tags: ["saludable", "congelable", "tupper"],
    source: "Directo al Paladar",
    url: "https://www.directoalpaladar.com/",
    ingredients: ["lentejas", "zanahoria", "puerro", "tomate", "laurel"]
  },
  {
    name: "Pollo al curry con arroz integral",
    tags: ["tupper", "congelable"],
    source: "Recetas de cocina",
    url: "https://www.recetasdecocina.com/",
    ingredients: ["pollo", "curry", "arroz integral", "leche de coco", "cebolla"]
  },
  {
    name: "Crema de calabaza (Thermomix)",
    tags: ["saludable", "thermomix", "congelable"],
    source: "Thermomix Magazine",
    url: "https://www.thermomixmagazine.com/",
    ingredients: ["calabaza", "zanahoria", "cebolla", "caldo vegetal"]
  },
  {
    name: "Salmón al horno con verduras",
    tags: ["saludable"],
    source: "BBC Good Food",
    url: "https://www.bbcgoodfood.com/",
    ingredients: ["salmón", "brócoli", "limón", "ajo"]
  },
  {
    name: "Pasta integral con pesto de espinacas",
    tags: ["saludable", "tupper"],
    source: "Bon Viveur",
    url: "https://www.bonviveur.es/",
    ingredients: ["pasta integral", "espinacas", "nueces", "ajo", "parmesano"]
  },
  {
    name: "Albóndigas de pavo en salsa",
    tags: ["congelable", "tupper"],
    source: "Recetas de rechupete",
    url: "https://www.recetasderechupete.com/",
    ingredients: ["pavo", "tomate", "cebolla", "ajo"]
  },
  {
    name: "Arroz con verduras (Thermomix)",
    tags: ["thermomix", "saludable"],
    source: "Thermomix España",
    url: "https://www.thermomix.com/es/",
    ingredients: ["arroz", "guisantes", "zanahoria", "judías verdes"]
  },
  {
    name: "Tortilla de espinacas y queso",
    tags: ["rapida", "tupper"],
    source: "Recetas de desayuno",
    url: "https://www.recetasdeescandalo.com/",
    ingredients: ["huevos", "espinacas", "queso", "aceite de oliva"]
  },
  {
    name: "Chili de verduras y alubias",
    tags: ["saludable", "congelable", "tupper"],
    source: "The Spruce Eats",
    url: "https://www.thespruceeats.com/",
    ingredients: ["alubias", "tomate", "pimiento", "maíz"]
  }
];

const SHOP_SUGGESTIONS = [
  { name: "Leche", category: "lacteos" },
  { name: "Huevos", category: "despensa" },
  { name: "Pollo", category: "carne" },
  { name: "Salmón", category: "pescado" },
  { name: "Plátanos", category: "fruta" },
  { name: "Tomates", category: "verdura" },
  { name: "Espinacas", category: "verdura" },
  { name: "Arroz", category: "despensa" },
  { name: "Café", category: "bebidas" },
  { name: "Papel de cocina", category: "limpieza" }
];

let suggestedRecipesCache = null;
let isApplyingRemote = false;
let syncTimer = null;
let lastRemoteUpdate = 0;
let lastLocalSync = 0;
let lastLocalUpdate = loadLastUpdated();
const clientId = getClientId();
let firestore = null;
let syncDocRef = null;

// --- DOM ---
const tabs = Array.from(document.querySelectorAll(".tab"));
const panels = {
  plan: document.getElementById("tab-plan"),
  recipes: document.getElementById("tab-recipes"),
  shop: document.getElementById("tab-shop"),
};

const weekRangeEl = document.getElementById("weekRange");
const weekGridEl = document.getElementById("weekGrid");
const prevWeekBtn = document.getElementById("prevWeekBtn");
const nextWeekBtn = document.getElementById("nextWeekBtn");
const clearPlanBtn = document.getElementById("clearPlanBtn");
const copyPrevWeekBtn = document.getElementById("copyPrevWeekBtn");

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const resultsEl = document.getElementById("results");
const similarResultsEl = document.getElementById("similarResults");
const similarHintEl = document.getElementById("similarHint");
const tagFilters = Array.from(document.querySelectorAll(".tag-filter input"));

const myRecipesEl = document.getElementById("myRecipes");
const clearRecipesBtn = document.getElementById("clearRecipesBtn");
const myRecipeSearch = document.getElementById("myRecipeSearch");
const myRecipeTag = document.getElementById("myRecipeTag");
const customRecipeName = document.getElementById("customRecipeName");
const customRecipeTags = document.getElementById("customRecipeTags");
const customRecipeIngredients = document.getElementById("customRecipeIngredients");
const customRecipeUrl = document.getElementById("customRecipeUrl");
const addCustomRecipeBtn = document.getElementById("addCustomRecipeBtn");

const shoppingListEl = document.getElementById("shoppingList");
const addFromPlanBtn = document.getElementById("addFromPlanBtn");
const clearShopChecksBtn = document.getElementById("clearShopChecksBtn");
const shopItemName = document.getElementById("shopItemName");
const shopItemQty = document.getElementById("shopItemQty");
const shopItemCategory = document.getElementById("shopItemCategory");
const addShopItemBtn = document.getElementById("addShopItemBtn");
const suggestionChips = document.getElementById("suggestionChips");

const pickerDialog = document.getElementById("pickerDialog");
const pickerKicker = document.getElementById("pickerKicker");
const pickerSearch = document.getElementById("pickerSearch");
const pickerTagFilter = document.getElementById("pickerTagFilter");
const pickerList = document.getElementById("pickerList");
const removeFromSlotBtn = document.getElementById("removeFromSlotBtn");
const slotTextInput = document.getElementById("slotTextInput");
const slotSaveAsRecipe = document.getElementById("slotSaveAsRecipe");
const slotTagsInput = document.getElementById("slotTagsInput");
const slotIngredientsInput = document.getElementById("slotIngredientsInput");
const slotUrlInput = document.getElementById("slotUrlInput");
const slotSaveBtn = document.getElementById("slotSaveBtn");

const assignDialog = document.getElementById("assignDialog");
const assignDay = document.getElementById("assignDay");
const assignMeal = document.getElementById("assignMeal");
const assignConfirmBtn = document.getElementById("assignConfirmBtn");

// --- STATE ---
let recipes = loadRecipes();
let planState = loadPlanState();
let shoppingItems = loadShoppingItems();
let pickerContext = null; // { slotId, dayISO, mealType }
let assignRecipeId = null;
let selectedSimilarRecipeId = null;

// --- INIT ---
initTabs();
ensurePlanWeekStart();
initFirebaseSync();
registerServiceWorker();
renderWeek();
renderSuggestedRecipes();
renderSimilarSuggestions();
renderMyRecipes();
renderShoppingList();
renderSuggestionChips();

// --- TABS ---
function initTabs(){
  tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      tabs.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const key = btn.dataset.tab;
      Object.values(panels).forEach(p => p.classList.remove("active"));
      panels[key].classList.add("active");
    });
  });
}

// --- WEEK / PLAN ---
prevWeekBtn.addEventListener("click", () => shiftWeek(-7));
nextWeekBtn.addEventListener("click", () => shiftWeek(7));

clearPlanBtn.addEventListener("click", () => {
  if (!confirm("¿Vaciar estas 2 semanas?")) return;
  const range = getTwoWeekRange(planState.currentWeekStart);
  range.forEach(dayISO => delete planState.entries[dayISO]);
  savePlanState(planState);
  renderWeek();
});

copyPrevWeekBtn.addEventListener("click", () => {
  const start = planState.currentWeekStart;
  const currentRange = getTwoWeekRange(start);
  currentRange.forEach((dayISO, index) => {
    const prevDay = addDaysISO(start, index - 14);
    const prevEntry = planState.entries[prevDay];
    if (prevEntry) {
      planState.entries[dayISO] = {
        lunch: cloneSlot(prevEntry.lunch),
        dinner: cloneSlot(prevEntry.dinner)
      };
    }
  });
  savePlanState(planState);
  renderWeek();
});

function ensurePlanWeekStart(){
  if (!planState.currentWeekStart){
    planState.currentWeekStart = mondayOfISO(todayISO());
    savePlanState(planState);
  }
}

function shiftWeek(deltaDays){
  planState.currentWeekStart = addDaysISO(planState.currentWeekStart, deltaDays);
  savePlanState(planState);
  renderWeek();
}

function renderWeek(){
  const start = planState.currentWeekStart;
  const end = addDaysISO(start, 13);
  weekRangeEl.textContent = `${formatDateShort(start)} → ${formatDateShort(end)}`;

  weekGridEl.innerHTML = "";
  const range = getTwoWeekRange(start);
  range.forEach((dayISO, index) => {
    const day = document.createElement("div");
    day.className = "day" + (index === 7 ? " week-divider" : "");

    const head = document.createElement("div");
    head.className = "day-head";
    head.innerHTML = `
      <div class="day-name">${DAYS_ES[index % 7]}</div>
      <div class="day-date">${formatDayMonth(dayISO)}</div>
    `;
    day.appendChild(head);

    day.appendChild(renderSlot(dayISO, "lunch", "Almuerzo"));
    day.appendChild(renderSlot(dayISO, "dinner", "Cena"));

    weekGridEl.appendChild(day);
  });
  refreshAssignDialogOptions();
}

function renderSlot(dayISO, mealType, label){
  const slotData = getSlot(dayISO, mealType);
  const info = resolveSlotInfo(slotData);

  const el = document.createElement("div");
  el.className = "slot" + (info.isEmpty ? " empty" : "");
  el.dataset.slotId = `${dayISO}_${mealType}`;

  el.innerHTML = `
    <div class="slot-label">${label}</div>
    <div class="slot-value">${info.title}</div>
    ${info.meta ? `<div class="slot-meta">${info.meta}</div>` : ""}
  `;

  el.addEventListener("click", () => openPicker({ slotId: `${dayISO}_${mealType}`, dayISO, mealType }));
  return el;
}

function resolveSlotInfo(slotData){
  if (!slotData || !slotData.type){
    return { title: "— vacío —", isEmpty: true, meta: null };
  }

  if (slotData.type === "recipe"){
    const recipe = recipes.find(r => r.id === slotData.value);
    if (!recipe) return { title: "Receta eliminada", isEmpty: false, meta: "Receta" };
    return { title: escapeHtml(recipe.name), isEmpty: false, meta: "Receta guardada" };
  }

  return { title: escapeHtml(slotData.value || "(sin título)"), isEmpty: false, meta: "Plato libre" };
}

function openPicker(ctx){
  pickerContext = ctx;
  const existingSlot = getSlot(ctx.dayISO, ctx.mealType);
  pickerKicker.textContent = `${formatDateLong(ctx.dayISO)} · ${ctx.mealType === "lunch" ? "Almuerzo" : "Cena"}`;
  pickerSearch.value = "";
  pickerTagFilter.value = "all";
  slotTextInput.value = existingSlot?.type === "text" ? existingSlot.value : "";
  slotSaveAsRecipe.checked = false;
  slotTagsInput.value = "";
  slotIngredientsInput.value = "";
  slotUrlInput.value = "";
  renderPickerList(getFilteredRecipesForPicker(), ctx.slotId);
  pickerDialog.showModal();
}

pickerSearch.addEventListener("input", () => {
  renderPickerList(getFilteredRecipesForPicker(), pickerContext?.slotId);
});

pickerTagFilter.addEventListener("change", () => {
  renderPickerList(getFilteredRecipesForPicker(), pickerContext?.slotId);
});

slotSaveBtn.addEventListener("click", () => {
  if (!pickerContext) return;
  const title = slotTextInput.value.trim();
  if (!title){
    alert("Escribe el nombre del plato para guardar.");
    return;
  }
  if (slotSaveAsRecipe.checked){
    const newRecipe = createRecipe({
      name: title,
      tags: parseTags(slotTagsInput.value),
      ingredients: parseIngredients(slotIngredientsInput.value),
      source: "Personal",
      url: slotUrlInput.value.trim()
    });
    recipes.unshift(newRecipe);
    saveRecipes(recipes);
    setSlot(pickerContext.dayISO, pickerContext.mealType, { type: "recipe", value: newRecipe.id });
    renderMyRecipes();
    renderSimilarSuggestions();
  } else {
    const detected = detectTagsFromText(title);
    setSlot(pickerContext.dayISO, pickerContext.mealType, {
      type: "text",
      value: title,
      tags: detected.tags,
      meta: detected.meta
    });
  }
  savePlanState(planState);
  renderWeek();
  pickerDialog.close();
});

removeFromSlotBtn.addEventListener("click", () => {
  if (!pickerContext) return;
  clearSlot(pickerContext.dayISO, pickerContext.mealType);
  savePlanState(planState);
  renderWeek();
});

function getFilteredRecipesForPicker(){
  const q = pickerSearch.value.trim().toLowerCase();
  const tag = pickerTagFilter.value;
  return recipes.filter(r => {
    const matchesQuery = !q || r.name.toLowerCase().includes(q);
    const matchesTag = tag === "all" || r.tags.includes(tag);
    return matchesQuery && matchesTag;
  });
}

function renderPickerList(list, slotId){
  pickerList.innerHTML = "";
  if (!list.length){
    pickerList.innerHTML = `<div class="muted">No hay recetas guardadas con este filtro.</div>`;
    return;
  }

  list.forEach(r => {
    const row = document.createElement("div");
    row.className = "picker-item";
    row.innerHTML = `
      <div>
        <div><strong>${escapeHtml(r.name)}</strong></div>
        <div class="muted">${r.ingredients.length} ingredientes · ${formatTags(r.tags)}</div>
      </div>
      <button class="btn primary" type="button">Asignar</button>
    `;
    row.querySelector("button").addEventListener("click", () => {
      const [dayISO, mealType] = slotId.split("_");
      setSlot(dayISO, mealType, { type: "recipe", value: r.id });
      savePlanState(planState);
      renderWeek();
      pickerDialog.close();
    });
    pickerList.appendChild(row);
  });
}

// --- RECIPES ---
searchBtn.addEventListener("click", () => {
  renderSuggestedRecipes();
  renderSimilarSuggestions();
});
searchInput.addEventListener("input", () => {
  renderSimilarSuggestions();
});
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") searchBtn.click();
});

tagFilters.forEach(cb => cb.addEventListener("change", renderSuggestedRecipes));

function renderSuggestedRecipes(){
  const query = searchInput.value.trim().toLowerCase();
  const activeTags = tagFilters.filter(cb => cb.checked).map(cb => cb.value);
  const filtered = filterRecipes(getSuggestedRecipes(), query, activeTags);
  if (!filtered.length){
    resultsEl.innerHTML = `<div class="muted">No hay resultados con estos filtros.</div>`;
    return;
  }
  renderSuggestedRecipeCards(filtered);
}

function renderSuggestedRecipeCards(list){
  resultsEl.innerHTML = "";

  list.forEach(recipe => {
    const card = document.createElement("div");
    card.className = "recipe-card";

    card.innerHTML = `
      <div class="image">Idea saludable</div>
      <div class="content">
        <h3>${escapeHtml(recipe.name)}</h3>
        <div class="muted">${escapeHtml(recipe.source)}</div>
        <div class="tags">${recipe.tags.map(tag => `<span class="tag">${TAG_LABELS[tag] || tag}</span>`).join("")}</div>
        <div class="actions">
          <button class="btn primary" type="button">Guardar</button>
          <button class="btn" type="button">Guardar + asignar</button>
          <a class="btn" href="${recipe.url}" target="_blank" rel="noopener">Ver receta</a>
        </div>
      </div>
    `;

    const [btnSave, btnSaveAssign] = card.querySelectorAll("button");
    btnSave.addEventListener("click", () => {
      const saved = saveSuggestedRecipe(recipe);
      if (!saved) return;
      renderMyRecipes();
      renderSimilarSuggestions();
      alert("Receta guardada en 'Mis recetas'.");
    });

    btnSaveAssign.addEventListener("click", () => {
      const saved = saveSuggestedRecipe(recipe);
      if (!saved) return;
      renderMyRecipes();
      renderSimilarSuggestions();
      openAssignDialog(saved.id);
    });

    resultsEl.appendChild(card);
  });
}

function renderSimilarSuggestions(){
  if (!similarResultsEl || !similarHintEl) return;
  const query = searchInput.value.trim();
  let target = null;
  let label = "";

  if (query){
    target = query;
    label = `Basado en “${query}”`;
  } else if (selectedSimilarRecipeId){
    const recipe = recipes.find(r => r.id === selectedSimilarRecipeId);
    if (recipe){
      target = recipe;
      label = `Basado en “${recipe.name}”`;
    }
  }

  if (!target){
    similarHintEl.textContent = "Escribe algo en el buscador o elige una receta guardada para ver sugerencias.";
    similarResultsEl.innerHTML = `<div class="muted">Sin sugerencias aún.</div>`;
    return;
  }

  const pool = buildSimilarityPool(6);
  const similar = getSimilarRecipes(target, pool, 6);
  similarHintEl.textContent = label;

  if (!similar.length){
    similarResultsEl.innerHTML = `<div class="muted">No hay sugerencias parecidas todavía.</div>`;
    return;
  }

  renderSimilarRecipeCards(similar);
}

function renderSimilarRecipeCards(list){
  similarResultsEl.innerHTML = "";

  list.forEach(recipe => {
    const card = document.createElement("div");
    card.className = "recipe-card";

    const tagsHtml = recipe.tags.map(tag => `<span class="tag">${TAG_LABELS[tag] || tag}</span>`).join("");
    const actions = document.createElement("div");
    actions.className = "actions";

    if (recipe.id){
      const assignBtn = document.createElement("button");
      assignBtn.className = "btn primary";
      assignBtn.type = "button";
      assignBtn.textContent = "Asignar";
      assignBtn.addEventListener("click", () => openAssignDialog(recipe.id));
      actions.appendChild(assignBtn);
    } else {
      const saveBtn = document.createElement("button");
      saveBtn.className = "btn primary";
      saveBtn.type = "button";
      saveBtn.textContent = "Guardar";
      saveBtn.addEventListener("click", () => {
        const saved = saveSuggestedRecipe(recipe);
        if (!saved) return;
        renderMyRecipes();
        renderSimilarSuggestions();
        alert("Receta guardada en 'Mis recetas'.");
      });

      const saveAssignBtn = document.createElement("button");
      saveAssignBtn.className = "btn";
      saveAssignBtn.type = "button";
      saveAssignBtn.textContent = "Guardar + asignar";
      saveAssignBtn.addEventListener("click", () => {
        const saved = saveSuggestedRecipe(recipe);
        if (!saved) return;
        renderMyRecipes();
        renderSimilarSuggestions();
        openAssignDialog(saved.id);
      });

      actions.appendChild(saveBtn);
      actions.appendChild(saveAssignBtn);
    }

    if (recipe.url){
      const link = document.createElement("a");
      link.className = "btn";
      link.href = recipe.url;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "Ver receta";
      actions.appendChild(link);
    }

    card.innerHTML = `
      <div class="image">Sugerencia</div>
      <div class="content">
        <h3>${escapeHtml(recipe.name)}</h3>
        <div class="muted">${escapeHtml(recipe.source || "Personal")}</div>
        <div class="tags">${tagsHtml}</div>
      </div>
    `;

    card.querySelector(".content").appendChild(actions);
    similarResultsEl.appendChild(card);
  });
}

function buildSimilarityPool(limit){
  const pool = recipes.map(r => ensureRecipeData({ ...r }));
  if (pool.length >= limit) return pool;

  getSuggestedRecipes().forEach(seed => {
    const exists = pool.some(r => r.name === seed.name && r.source === seed.source);
    if (!exists) pool.push(seed);
  });
  return pool;
}

function filterRecipes(list, query, activeTags){
  return list.filter(r => {
    const name = r.name || "";
    const matchesQuery = !query || name.toLowerCase().includes(query);
    const hasTags = Array.isArray(r.tags) && r.tags.length;
    const matchesTags = !activeTags.length || !hasTags || activeTags.every(tag => r.tags.includes(tag));
    return matchesQuery && matchesTags;
  });
}

function normalizeIngredientList(list){
  return list
    .map(ing => {
      if (!ing) return null;
      if (typeof ing === "string") return { name: ing.trim() };
      if (typeof ing === "object" && ing.name) return { name: String(ing.name).trim() };
      return null;
    })
    .filter(Boolean);
}

addCustomRecipeBtn.addEventListener("click", () => {
  const name = customRecipeName.value.trim();
  if (!name){
    alert("Escribe el nombre de la receta.");
    return;
  }
  const newRecipe = createRecipe({
    name,
    tags: parseTags(customRecipeTags.value),
    ingredients: parseIngredients(customRecipeIngredients.value),
    source: "Personal",
    url: customRecipeUrl.value.trim()
  });
  recipes.unshift(newRecipe);
  saveRecipes(recipes);
  customRecipeName.value = "";
  customRecipeTags.value = "";
  customRecipeIngredients.value = "";
  customRecipeUrl.value = "";
  renderMyRecipes();
  renderSimilarSuggestions();
});

myRecipeSearch.addEventListener("input", renderMyRecipes);
myRecipeTag.addEventListener("change", renderMyRecipes);

function renderMyRecipes(){
  myRecipesEl.innerHTML = "";
  if (!recipes.length){
    myRecipesEl.innerHTML = `<div class="muted">Aún no tienes recetas. Guarda alguna idea desde la búsqueda.</div>`;
    return;
  }

  const q = myRecipeSearch.value.trim().toLowerCase();
  const tag = myRecipeTag.value;

  const filtered = recipes.filter(r => {
    const matchesQuery = !q || r.name.toLowerCase().includes(q);
    const matchesTag = tag === "all" || r.tags.includes(tag);
    return matchesQuery && matchesTag;
  });

  if (!filtered.length){
    myRecipesEl.innerHTML = `<div class="muted">No hay recetas con este filtro.</div>`;
    return;
  }

  filtered.forEach(r => {
    const row = document.createElement("div");
    row.className = "my-recipe-item";
    row.classList.toggle("selected", r.id === selectedSimilarRecipeId);
    row.innerHTML = `
      <div class="left">
        <div><strong>${escapeHtml(r.name)}</strong></div>
        <div class="meta">${r.ingredients.length} ingredientes · ${formatTags(r.tags)}</div>
      </div>
      <div class="right">
        <button class="btn" type="button">Similares</button>
        <button class="btn" type="button">Asignar…</button>
        <button class="btn danger" type="button">Eliminar</button>
      </div>
    `;

    const [btnSimilar, btnAssign, btnDelete] = row.querySelectorAll("button");
    btnSimilar.addEventListener("click", () => {
      selectedSimilarRecipeId = r.id;
      renderMyRecipes();
      renderSimilarSuggestions();
    });

    btnAssign.addEventListener("click", () => {
      openAssignDialog(r.id);
    });

    btnDelete.addEventListener("click", () => {
      if (!confirm(`¿Eliminar "${r.name}"?`)) return;
      recipes = recipes.filter(x => x.id !== r.id);
      if (selectedSimilarRecipeId === r.id){
        selectedSimilarRecipeId = null;
      }
      saveRecipes(recipes);
      removeRecipeFromPlan(r.id);
      renderMyRecipes();
      renderWeek();
      renderSimilarSuggestions();
    });

    myRecipesEl.appendChild(row);
  });
}

clearRecipesBtn.addEventListener("click", () => {
  if (!confirm("¿Borrar TODAS tus recetas guardadas?")) return;
  recipes = [];
  selectedSimilarRecipeId = null;
  saveRecipes(recipes);
  planState.entries = {};
  savePlanState(planState);
  renderMyRecipes();
  renderWeek();
  renderSimilarSuggestions();
});

function saveSuggestedRecipe(recipe){
  const existing = recipes.find(r => r.source === recipe.source && r.name === recipe.name);
  if (existing) return existing;
  const saved = createRecipe({
    name: recipe.name,
    tags: recipe.tags,
    ingredients: normalizeIngredientList(recipe.ingredients || []),
    source: recipe.source,
    url: recipe.url,
    meta: recipe.meta
  });
  recipes.unshift(saved);
  saveRecipes(recipes);
  return saved;
}

function createRecipe({ name, tags, ingredients, source, url, meta }){
  const detected = detectTagsFromText(name);
  const resolvedTags = tags?.length ? tags : detected.tags;
  const resolvedMeta = mergeMeta(meta, detected.meta);
  return {
    id: cryptoId(),
    name,
    tags: Array.from(new Set(resolvedTags || [])).filter(Boolean),
    ingredients: ingredients || [],
    source: source || "Personal",
    url: url || "",
    meta: resolvedMeta,
    createdAt: Date.now()
  };
}

function formatTags(tags){
  if (!tags?.length) return "sin etiquetas";
  return tags.map(tag => TAG_LABELS[tag] || tag).join(" · ");
}

function parseTags(raw){
  return raw
    .split(/,|\n/)
    .map(t => t.trim().toLowerCase())
    .filter(Boolean);
}

function parseIngredients(raw){
  return raw
    .split(/,|\n/)
    .map(item => item.trim())
    .filter(Boolean)
    .map(name => ({ name }));
}

function getSuggestedRecipes(){
  if (!suggestedRecipesCache){
    suggestedRecipesCache = SUGGESTED_RECIPES.map(recipe => ensureRecipeData({
      ...recipe,
      tags: recipe.tags || [],
      ingredients: normalizeIngredientList(recipe.ingredients || [])
    }));
  }
  return suggestedRecipesCache;
}

// Detecta tags y metadatos desde texto (offline).
function detectTagsFromText(text){
  const normalized = normalizeText(text);
  const tags = new Set();
  const meta = { ...META_DEFAULTS };

  if (!normalized) return { tags: [], meta };

  const hasAny = (words) => words.some(word => normalized.includes(normalizeText(word)));

  const proteinHits = [];
  if (hasAny(["pollo", "pechuga", "ternera", "cerdo", "pavo", "carne"])){
    proteinHits.push("carne");
  }
  if (hasAny(["salmon", "salmón", "atun", "atún", "merluza", "pescado"])){
    proteinHits.push("pescado");
  }
  if (hasAny(["lentejas", "garbanzos", "alubias", "judias", "judías", "legumbres"])){
    proteinHits.push("legumbres");
  }
  if (hasAny(["huevo", "huevos", "tortilla"])){
    proteinHits.push("huevos");
  }

  const isVegetarian = hasAny(["vegetariano", "vegetariana", "vegano", "vegana", "vegetal"]);
  if (isVegetarian){
    meta.protein = "vegetariano";
  } else if (proteinHits.length === 1){
    meta.protein = proteinHits[0];
  } else if (proteinHits.length > 1){
    meta.protein = "mixto";
  }

  const baseRules = [
    ["arroz", ["arroz", "integral"]],
    ["pasta", ["pasta", "macarrones", "espagueti", "espaguetis"]],
    ["patata", ["patata", "papas", "papa"]],
    ["pan", ["pan", "bocadillo", "tosta"]],
    ["quinoa", ["quinoa"]],
    ["cuscus", ["cuscus", "cuscús"]],
    ["legumbre", ["lentejas", "garbanzos", "alubias", "judias", "judías", "legumbre"]],
    ["verdura", ["verdura", "verduras", "calabacin", "calabacín", "brocoli", "brócoli"]],
    ["ninguna", ["sin base"]]
  ];

  for (const [base, words] of baseRules){
    if (hasAny(words)){
      meta.base = base;
      break;
    }
  }

  const hasThermomix = normalized.includes("thermomix");
  if (hasThermomix){
    meta.technique = "thermomix";
  } else if (hasAny(["ensalada"])){
    meta.technique = "ensalada";
  } else if (hasAny(["plancha"])){
    meta.technique = "plancha";
  } else if (hasAny(["sarten", "sartén", "salteado", "saltear"])){
    meta.technique = "salteado";
  } else if (hasAny(["horno", "asado", "asada", "asados"])){
    meta.technique = "horno";
  } else if (hasAny(["guiso", "estofado", "estofada", "estofadas"])){
    meta.technique = "guiso";
  } else if (hasAny(["crema", "pure", "puré"])){
    meta.technique = "guiso";
  } else if (hasAny(["vapor"])){
    meta.technique = "vapor";
  } else if (hasAny(["freidora", "airfryer", "air fryer"])){
    meta.technique = "freidora";
  } else if (hasAny(["crudo", "tartar"])){
    meta.technique = "crudo";
  }

  const healthyWords = ["ensalada", "plancha", "verduras", "integral"];
  const congelableWords = ["guiso", "estofado", "lentejas", "albondigas", "albóndigas", "curry", "salsa"];
  const tupperWords = ["bowl", "tupper", "meal prep", "para llevar"];
  const fastWords = ["rapido", "rápido", "rapida", "rápida"];

  if (["carne", "pescado", "huevos", "legumbres", "mixto"].includes(meta.protein)){
    tags.add("alta_proteina");
  }
  if (meta.protein === "vegetariano"){
    tags.add("vegetariana");
  }
  if (hasThermomix){
    tags.add("thermomix");
  }
  if (hasAny(healthyWords)){
    tags.add("saludable");
  }
  if (hasAny(congelableWords)){
    tags.add("congelable");
    tags.add("tupper");
  }
  if (hasAny(tupperWords)){
    tags.add("tupper");
  }
  if (hasAny(fastWords) || /\b(10|15)\s*min\b/.test(normalized)){
    tags.add("rapida");
  }

  return { tags: Array.from(tags), meta };
}

// Sugiere recetas similares según meta y tags.
function getSimilarRecipes(targetRecipeOrText, list, limit = 6){
  const target = typeof targetRecipeOrText === "string"
    ? detectTagsFromText(targetRecipeOrText)
    : ensureRecipeData({ ...targetRecipeOrText });

  const targetTags = new Set(target.tags || []);
  const targetMeta = target.meta || META_DEFAULTS;
  const wantsTupper = targetTags.has("tupper");
  const wantsCongelable = targetTags.has("congelable");

  const scored = list
    .map(recipe => {
      const data = ensureRecipeData({ ...recipe });
      if (target.id && data.id && target.id === data.id) return null;
      if (!target.id && target.name && data.name && target.name === data.name) return null;

      let score = 0;
      if (targetMeta.protein !== "desconocido" && data.meta?.protein === targetMeta.protein) score += 3;
      if (targetMeta.base !== "desconocido" && data.meta?.base === targetMeta.base) score += 2;
      if (targetMeta.technique !== "desconocido" && data.meta?.technique === targetMeta.technique) score += 2;

      targetTags.forEach(tag => {
        if (data.tags?.includes(tag)) score += 1;
      });

      if (wantsTupper && !data.tags?.includes("tupper")) score -= 2;
      if (wantsCongelable && !data.tags?.includes("congelable")) score -= 2;

      return { recipe: data, score };
    })
    .filter(Boolean)
    .sort((a,b) => b.score - a.score);

  return scored.filter(item => item.score > 0).slice(0, limit).map(item => item.recipe);
}

function ensureRecipeData(recipe){
  const detected = detectTagsFromText(recipe.name);
  const tags = Array.from(new Set((recipe.tags?.length ? recipe.tags : detected.tags) || [])).filter(Boolean);
  return {
    ...recipe,
    tags,
    meta: mergeMeta(recipe.meta, detected.meta)
  };
}

function mergeMeta(existing, detected){
  const merged = { ...META_DEFAULTS, ...(existing || {}) };
  Object.keys(merged).forEach(key => {
    if (!merged[key] || merged[key] === "desconocido"){
      merged[key] = detected[key] || merged[key];
    }
  });
  return merged;
}

// --- Assign dialog ---
function openAssignDialog(recipeId){
  assignRecipeId = recipeId;
  refreshAssignDialogOptions();
  assignDialog.showModal();
}

function refreshAssignDialogOptions(){
  if (!assignDay) return;
  const range = getTwoWeekRange(planState.currentWeekStart);
  assignDay.innerHTML = "";
  range.forEach(dayISO => {
    const opt = document.createElement("option");
    opt.value = dayISO;
    opt.textContent = formatDateLong(dayISO);
    assignDay.appendChild(opt);
  });
}

assignConfirmBtn.addEventListener("click", () => {
  if (!assignRecipeId) return;
  const dayISO = assignDay.value;
  const mealType = assignMeal.value;
  setSlot(dayISO, mealType, { type: "recipe", value: assignRecipeId });
  savePlanState(planState);
  renderWeek();
  assignDialog.close();
});

// --- SHOPPING LIST ---
addShopItemBtn.addEventListener("click", () => {
  const name = shopItemName.value.trim();
  if (!name){
    alert("Escribe un ingrediente.");
    return;
  }
  const newItem = {
    id: cryptoId(),
    name,
    qty: shopItemQty.value.trim(),
    category: shopItemCategory.value,
    checked: false,
    addedAt: Date.now()
  };
  shoppingItems.unshift(newItem);
  saveShoppingItems(shoppingItems);
  shopItemName.value = "";
  shopItemQty.value = "";
  renderShoppingList();
});

addFromPlanBtn.addEventListener("click", () => {
  const added = addIngredientsFromPlan();
  if (!added){
    alert("No hay ingredientes que añadir desde el plan actual.");
  }
  renderShoppingList();
});

clearShopChecksBtn.addEventListener("click", () => {
  shoppingItems = shoppingItems.map(item => ({ ...item, checked: false }));
  saveShoppingItems(shoppingItems);
  renderShoppingList();
});

function renderSuggestionChips(){
  suggestionChips.innerHTML = "";
  SHOP_SUGGESTIONS.forEach(item => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "suggestion-chip";
    chip.textContent = `${item.name} · ${CATEGORY_LABELS[item.category]}`;
    chip.addEventListener("click", () => {
      shoppingItems.unshift({
        id: cryptoId(),
        name: item.name,
        qty: "",
        category: item.category,
        checked: false,
        addedAt: Date.now()
      });
      saveShoppingItems(shoppingItems);
      renderShoppingList();
    });
    suggestionChips.appendChild(chip);
  });
}

function renderShoppingList(){
  shoppingListEl.innerHTML = "";
  if (!shoppingItems.length){
    shoppingListEl.innerHTML = `<div class="muted">Aún no tienes ingredientes. Añade algunos o genera desde el plan.</div>`;
    return;
  }

  const recentItems = [...shoppingItems]
    .sort((a,b) => b.addedAt - a.addedAt)
    .slice(0, 5);

  shoppingListEl.appendChild(renderShopSection("Añadido recientemente", recentItems));

  const grouped = groupByCategory(shoppingItems);
  Object.keys(CATEGORY_LABELS).forEach(category => {
    if (!grouped[category]?.length) return;
    shoppingListEl.appendChild(renderShopSection(CATEGORY_LABELS[category], grouped[category]));
  });
}

function renderShopSection(title, items){
  const section = document.createElement("div");
  section.className = "shop-section";
  section.innerHTML = `<h3>${title}</h3>`;

  items.forEach(item => {
    const row = document.createElement("div");
    row.className = "shop-item";
    row.innerHTML = `
      <label>
        <input type="checkbox" ${item.checked ? "checked" : ""} />
        <div>
          <div class="name">${escapeHtml(item.name)}</div>
          <div class="measure">${escapeHtml(item.qty || "")}</div>
        </div>
      </label>
      <button class="btn danger" type="button">Quitar</button>
    `;

    row.querySelector("input").addEventListener("change", (e) => {
      item.checked = e.target.checked;
      saveShoppingItems(shoppingItems);
    });

    row.querySelector("button").addEventListener("click", () => {
      shoppingItems = shoppingItems.filter(x => x.id !== item.id);
      saveShoppingItems(shoppingItems);
      renderShoppingList();
    });

    section.appendChild(row);
  });

  return section;
}

function addIngredientsFromPlan(){
  const range = getTwoWeekRange(planState.currentWeekStart);
  let added = false;

  range.forEach(dayISO => {
    const entry = planState.entries[dayISO];
    if (!entry) return;
    [entry.lunch, entry.dinner].forEach(slot => {
      if (!slot || slot.type !== "recipe") return;
      const recipe = recipes.find(r => r.id === slot.value);
      if (!recipe || !recipe.ingredients.length) return;
      recipe.ingredients.forEach(ing => {
        const normalized = normalizeName(ing.name);
        const exists = shoppingItems.find(item => normalizeName(item.name) === normalized);
        if (exists) return;
        shoppingItems.unshift({
          id: cryptoId(),
          name: ing.name,
          qty: "",
          category: guessCategory(ing.name),
          checked: false,
          addedAt: Date.now()
        });
        added = true;
      });
    });
  });

  saveShoppingItems(shoppingItems);
  return added;
}

function groupByCategory(items){
  return items.reduce((acc, item) => {
    const key = item.category || "otros";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

function guessCategory(name){
  const n = normalizeName(name);
  if (/pollo|ternera|cerdo|pavo|carne/.test(n)) return "carne";
  if (/salmon|salmón|atun|atún|pescado|merluza/.test(n)) return "pescado";
  if (/manzana|platano|plátano|pera|fresa|fruta/.test(n)) return "fruta";
  if (/lechuga|tomate|zanahoria|cebolla|pimiento|brocoli|brócoli|verdura/.test(n)) return "verdura";
  if (/leche|queso|yogur|mantequilla/.test(n)) return "lacteos";
  if (/agua|refresco|zumo|cafe|café|vino/.test(n)) return "bebidas";
  return "despensa";
}

// --- PLAN HELPERS ---
function getSlot(dayISO, mealType){
  const entry = planState.entries[dayISO];
  return entry ? entry[mealType] : null;
}

function setSlot(dayISO, mealType, slotData){
  if (!planState.entries[dayISO]){
    planState.entries[dayISO] = { lunch: null, dinner: null };
  }
  planState.entries[dayISO][mealType] = slotData;
}

function clearSlot(dayISO, mealType){
  if (!planState.entries[dayISO]) return;
  planState.entries[dayISO][mealType] = null;
}

function removeRecipeFromPlan(recipeId){
  Object.values(planState.entries).forEach(entry => {
    if (entry?.lunch?.type === "recipe" && entry.lunch.value === recipeId) entry.lunch = null;
    if (entry?.dinner?.type === "recipe" && entry.dinner.value === recipeId) entry.dinner = null;
  });
  savePlanState(planState);
}

function cloneSlot(slot){
  if (!slot) return null;
  return { ...slot };
}

function getTwoWeekRange(startISO){
  return Array.from({ length: 14 }, (_, i) => addDaysISO(startISO, i));
}

// --- Sync (Firebase Firestore) ---
function initFirebaseSync(){
  if (!window.firebase || !window.FIREBASE_CONFIG) return;
  if (!firebase.apps.length){
    firebase.initializeApp(window.FIREBASE_CONFIG);
  }
  firestore = firebase.firestore();
  syncDocRef = firestore.collection("mealPlanner").doc(window.FIREBASE_SYNC_DOC || "default");

  syncDocRef.onSnapshot((snap) => {
    const data = snap.data();
    if (!data?.updatedAt || data.updatedAt <= lastRemoteUpdate) return;
    if (data.updatedAt <= lastLocalSync) return;
    if (data.updatedAt <= lastLocalUpdate) return;
    if (data.updatedBy === clientId) return;
    lastRemoteUpdate = data.updatedAt;
    applyRemoteState(data);
  });

  scheduleSync();
}

function applyRemoteState(data){
  if (!data?.payload) return;
  isApplyingRemote = true;
  const payload = data.payload;

  if (Array.isArray(payload.recipes)){
    recipes = payload.recipes.map(r => ensureRecipeData({ ...r, tags: r.tags || [], ingredients: r.ingredients || [] }));
    saveRecipes(recipes);
  }
  if (payload.planState?.entries){
    planState = payload.planState;
    savePlanState(planState);
  }
  if (Array.isArray(payload.shoppingItems)){
    shoppingItems = payload.shoppingItems;
    saveShoppingItems(shoppingItems);
  }

  renderWeek();
  renderSuggestedRecipes();
  renderSimilarSuggestions();
  renderMyRecipes();
  renderShoppingList();
  setLastUpdated(data.updatedAt);
  isApplyingRemote = false;
}

function scheduleSync(){
  if (!syncDocRef) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(pushStateToRemote, 800);
}

function pushStateToRemote(){
  if (!syncDocRef) return;
  const payload = {
    recipes,
    planState,
    shoppingItems
  };
  const now = Date.now();
  lastLocalSync = now;
  syncDocRef.set(
    {
      payload,
      updatedAt: now,
      updatedBy: clientId
    },
    { merge: true }
  );
}

// --- STORAGE ---
function loadRecipes(){
  try{
    const raw = localStorage.getItem(LS.RECIPES);
    const arr = raw ? JSON.parse(raw) : [];
    if (Array.isArray(arr) && arr.length){
      return arr.map(r => ensureRecipeData({ ...r, tags: r.tags || [], ingredients: r.ingredients || [] }));
    }
    const legacyRaw = localStorage.getItem("mp_recipes_v1");
    if (legacyRaw){
      const legacyArr = JSON.parse(legacyRaw);
      if (Array.isArray(legacyArr)){
        return legacyArr.map(r => ensureRecipeData({
          ...r,
          tags: r.tags || [],
          ingredients: r.ingredients || [],
          source: r.source || "Importado",
          url: r.url || ""
        }));
      }
    }
    return [];
  }catch{
    return [];
  }
}

function saveRecipes(arr){
  localStorage.setItem(LS.RECIPES, JSON.stringify(arr));
  if (!isApplyingRemote){
    markLocalUpdate();
    scheduleSync();
  }
}

function loadPlanState(){
  try{
    const raw = localStorage.getItem(LS.PLAN);
    if (raw){
      const parsed = JSON.parse(raw);
      if (parsed?.entries) return parsed;
    }
  }catch{
    // ignore
  }
  // migrate from old v1 if exists
  const legacy = loadLegacyPlan();
  if (legacy){
    return legacy;
  }
  return { currentWeekStart: null, entries: {} };
}

function savePlanState(state){
  localStorage.setItem(LS.PLAN, JSON.stringify(state));
  if (!isApplyingRemote){
    markLocalUpdate();
    scheduleSync();
  }
}

function loadLegacyPlan(){
  try{
    const raw = localStorage.getItem("mp_plan_v1");
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj?.weekStartISO) return null;
    const entries = {};
    Object.entries(obj.slots || {}).forEach(([slotId, value]) => {
      const [dayISO, mealType] = slotId.split("_");
      if (!entries[dayISO]) entries[dayISO] = { lunch: null, dinner: null };
      entries[dayISO][mealType] = { type: "recipe", value };
    });
    return { currentWeekStart: obj.weekStartISO, entries };
  }catch{
    return null;
  }
}

function loadShoppingItems(){
  try{
    const raw = localStorage.getItem(LS.SHOP_ITEMS);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  }catch{
    return [];
  }
}

function saveShoppingItems(arr){
  localStorage.setItem(LS.SHOP_ITEMS, JSON.stringify(arr));
  if (!isApplyingRemote){
    markLocalUpdate();
    scheduleSync();
  }
}

// --- Helpers: dates ---
function todayISO(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

function mondayOfISO(iso){
  const d = new Date(iso + "T00:00:00");
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  return toISO(d);
}

function addDaysISO(iso, days){
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toISO(d);
}

function toISO(d){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

function formatDateShort(iso){
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-ES", { day:"2-digit", month:"2-digit" });
}

function formatDayMonth(iso){
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-ES", { day:"2-digit", month:"short" });
}

function formatDateLong(iso){
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-ES", { weekday:"long", day:"2-digit", month:"long" });
}

// --- Helpers: misc ---
function cryptoId(){
  return (crypto?.randomUUID ? crypto.randomUUID() : `id_${Math.random().toString(16).slice(2)}_${Date.now()}`);
}

function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function activateTab(key){
  tabs.forEach(b => b.classList.toggle("active", b.dataset.tab === key));
  Object.entries(panels).forEach(([k,p]) => p.classList.toggle("active", k === key));
}

function normalizeName(value){
  return normalizeText(value);
}

function normalizeText(value){
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function loadLastUpdated(){
  const raw = localStorage.getItem(LS.LAST_UPDATED);
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

function setLastUpdated(timestamp){
  lastLocalUpdate = timestamp;
  localStorage.setItem(LS.LAST_UPDATED, String(timestamp));
}

function markLocalUpdate(){
  setLastUpdated(Date.now());
}

function getClientId(){
  const existing = localStorage.getItem(LS.CLIENT_ID);
  if (existing) return existing;
  const next = cryptoId();
  localStorage.setItem(LS.CLIENT_ID, next);
  return next;
}

function registerServiceWorker(){
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js");
  });
}
