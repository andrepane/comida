/***********************
 * Meal Planner (v0)
 * - Plan semanal (almuerzo/cena)
 * - Buscar en TheMealDB (en inglés; diccionario ES->EN básico)
 * - Importar recetas a "Mis recetas" (localStorage)
 * - Lista de compra desde el plan semanal
 ************************/

const API_KEY = "1"; // TheMealDB test key
const BASE_URL = `https://www.themealdb.com/api/json/v1/${API_KEY}`;

const LS = {
  RECIPES: "mp_recipes_v1",
  PLAN: "mp_plan_v1",
  SHOP_CHECKS: "mp_shop_checks_v1"
};

const DAYS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// Diccionario básico ES -> EN para búsquedas rápidas.
// Amplíalo cuando te falte algo.
const ES_TO_EN = {
  "pollo": "chicken",
  "pavo": "turkey",
  "ternera": "beef",
  "cerdo": "pork",
  "atun": "tuna",
  "atún": "tuna",
  "salmón": "salmon",
  "salmon": "salmon",
  "arroz": "rice",
  "pasta": "pasta",
  "patata": "potato",
  "papas": "potato",
  "lentejas": "lentils",
  "garbanzos": "chickpeas",
  "judias": "beans",
  "judías": "beans",
  "huevos": "eggs",
  "verduras": "vegetables",
  "ensalada": "salad",
  "tomate": "tomato",
  "cebolla": "onion",
  "ajo": "garlic",
  "zanahoria": "carrot",
  "calabacin": "zucchini",
  "calabacín": "zucchini",
  "pollo arroz": "chicken rice",
  "carne": "meat",
  "pescado": "fish",
  "curry": "curry",
  "mexicano": "mexican",
  "italiano": "italian"
};

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
const searchLangInfo = document.getElementById("searchLangInfo");

const myRecipesEl = document.getElementById("myRecipes");
const clearRecipesBtn = document.getElementById("clearRecipesBtn");
const exportBtn = document.getElementById("exportBtn");
const importFile = document.getElementById("importFile");

const shoppingListEl = document.getElementById("shoppingList");
const regenShopBtn = document.getElementById("regenShopBtn");
const clearShopChecksBtn = document.getElementById("clearShopChecksBtn");

const pickerDialog = document.getElementById("pickerDialog");
const pickerKicker = document.getElementById("pickerKicker");
const pickerTitle = document.getElementById("pickerTitle");
const pickerSearch = document.getElementById("pickerSearch");
const pickerList = document.getElementById("pickerList");
const removeFromSlotBtn = document.getElementById("removeFromSlotBtn");

// --- STATE ---
let recipes = loadRecipes(); // {id, name, source, ingredients[], instructions, createdAt}
let plan = loadPlan();       // {weekStartISO, slots: { [slotId]: recipeId|null } }
let pickerContext = null;    // { slotId, dayISO, mealType }

// --- INIT ---
initTabs();
ensurePlanWeekStart();
renderWeek();
renderMyRecipes();
renderShoppingList(); // render last generated / checks

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
  if (!confirm("¿Vaciar toda la semana actual?")) return;
  plan.slots = {};
  savePlan(plan);
  renderWeek();
});

copyPrevWeekBtn.addEventListener("click", () => {
  const prevWeekStart = addDaysISO(plan.weekStartISO, -7);
  const prevPlan = loadPlanForWeek(prevWeekStart);
  plan.slots = { ...(prevPlan?.slots || {}) };
  savePlan(plan);
  renderWeek();
});

function ensurePlanWeekStart(){
  // Semana basada en lunes (puedes cambiar a viernes si quieres luego)
  // Para viernes-a-viernes es un ajuste; de momento lo hacemos estándar.
  if (!plan.weekStartISO){
    plan.weekStartISO = mondayOfISO(todayISO());
    plan.slots = {};
    savePlan(plan);
  }
}

function shiftWeek(deltaDays){
  plan.weekStartISO = addDaysISO(plan.weekStartISO, deltaDays);
  plan.slots = loadPlanForWeek(plan.weekStartISO)?.slots || {};
  savePlan(plan);
  renderWeek();
}

function renderWeek(){
  const start = plan.weekStartISO;
  const end = addDaysISO(start, 6);
  weekRangeEl.textContent = `${formatDateShort(start)} → ${formatDateShort(end)}`;

  weekGridEl.innerHTML = "";
  for (let i=0;i<7;i++){
    const dayISO = addDaysISO(start, i);
    const day = document.createElement("div");
    day.className = "day";

    const head = document.createElement("div");
    head.className = "day-head";
    head.innerHTML = `
      <div class="day-name">${DAYS_ES[i]}</div>
      <div class="day-date">${formatDayMonth(dayISO)}</div>
    `;
    day.appendChild(head);

    day.appendChild(renderSlot(dayISO, "lunch", "Almuerzo"));
    day.appendChild(renderSlot(dayISO, "dinner", "Cena"));

    weekGridEl.appendChild(day);
  }
}

function renderSlot(dayISO, mealType, label){
  const slotId = `${dayISO}_${mealType}`;
  const recipeId = plan.slots[slotId] || null;
  const recipe = recipeId ? recipes.find(r => r.id === recipeId) : null;

  const el = document.createElement("div");
  el.className = "slot" + (recipe ? "" : " empty");
  el.dataset.slotId = slotId;

  el.innerHTML = `
    <div class="slot-label">${label}</div>
    <div class="slot-value">${recipe ? escapeHtml(recipe.name) : "— vacío —"}</div>
  `;

  el.addEventListener("click", () => openPicker({ slotId, dayISO, mealType }));
  return el;
}

function openPicker(ctx){
  pickerContext = ctx;
  pickerKicker.textContent = `${formatDateLong(ctx.dayISO)} · ${ctx.mealType === "lunch" ? "Almuerzo" : "Cena"}`;
  pickerTitle.textContent = "Elegir receta";
  pickerSearch.value = "";
  renderPickerList(recipes, ctx.slotId);
  pickerDialog.showModal();
}

pickerSearch.addEventListener("input", () => {
  const q = pickerSearch.value.trim().toLowerCase();
  const filtered = q
    ? recipes.filter(r => r.name.toLowerCase().includes(q))
    : recipes;
  renderPickerList(filtered, pickerContext?.slotId);
});

removeFromSlotBtn.addEventListener("click", (e) => {
  // Esto se ejecuta porque es un botón dentro del form dialog
  if (!pickerContext) return;
  delete plan.slots[pickerContext.slotId];
  savePlan(plan);
  renderWeek();
});

function renderPickerList(list, slotId){
  pickerList.innerHTML = "";
  if (!list.length){
    pickerList.innerHTML = `<div class="muted">No tienes recetas aún. Importa alguna desde “Buscar”.</div>`;
    return;
  }

  list.forEach(r => {
    const row = document.createElement("div");
    row.className = "picker-item";
    row.innerHTML = `
      <div>
        <div><strong>${escapeHtml(r.name)}</strong></div>
        <div class="muted">${r.ingredients.length} ingredientes</div>
      </div>
      <button class="btn primary" type="button">Asignar</button>
    `;
    row.querySelector("button").addEventListener("click", () => {
      plan.slots[slotId] = r.id;
      savePlan(plan);
      renderWeek();
      pickerDialog.close();
    });
    pickerList.appendChild(row);
  });
}

// --- SEARCH (TheMealDB) ---
searchBtn.addEventListener("click", async () => {
  const raw = searchInput.value.trim();
  if (!raw) return;
  await searchMeals(raw);
});

searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") searchBtn.click();
});

async function searchMeals(rawQuery){
  resultsEl.innerHTML = `<div class="muted">Buscando…</div>`;

  const { queryEN, info } = normalizeQueryToEnglish(rawQuery);
  searchLangInfo.textContent = info;

  try{
    const res = await fetch(`${BASE_URL}/search.php?s=${encodeURIComponent(queryEN)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderResults(data.meals || [], rawQuery, queryEN);
  }catch(err){
    console.error(err);
    resultsEl.innerHTML = `<div class="muted">Error buscando recetas.</div>`;
  }
}

function normalizeQueryToEnglish(raw){
  const lower = raw.toLowerCase().trim();

  // Si el usuario ya mete inglés, no molestamos.
  // Heurística: si contiene solo letras y espacios, puede ser cualquiera; así que usamos diccionario por palabras.
  // Convertimos palabra a palabra si están en ES_TO_EN.
  const tokens = lower.split(/\s+/).filter(Boolean);
  let changed = false;
  const mapped = tokens.map(t => {
    if (ES_TO_EN[t]) { changed = true; return ES_TO_EN[t]; }
    return t;
  }).join(" ");

  // Frases completas más específicas
  const phrase = ES_TO_EN[lower];
  if (phrase) {
    return { queryEN: phrase, info: `Consulta: "${raw}" → "${phrase}" (ES→EN)` };
  }

  if (changed) {
    return { queryEN: mapped, info: `Consulta: "${raw}" → "${mapped}" (ES→EN)` };
  }

  return { queryEN: raw, info: `Consulta en inglés: "${raw}"` };
}

function renderResults(meals, rawQuery, queryEN){
  if (!meals.length){
    resultsEl.innerHTML = `<div class="muted">No hay resultados para "${escapeHtml(queryEN)}".</div>`;
    return;
  }

  resultsEl.innerHTML = "";
  meals.forEach(meal => {
    const card = document.createElement("div");
    card.className = "recipe-card";

    card.innerHTML = `
      <img src="${meal.strMealThumb}" alt="${escapeHtml(meal.strMeal)}">
      <div class="content">
        <h3>${escapeHtml(meal.strMeal)}</h3>
        <div class="muted">${meal.strArea ? escapeHtml(meal.strArea) : "—"} · ${meal.strCategory ? escapeHtml(meal.strCategory) : "—"}</div>
        <div class="actions">
          <button class="btn primary" type="button">Importar</button>
          <button class="btn" type="button">Importar + asignar…</button>
        </div>
      </div>
    `;

    const [btnImport, btnImportAssign] = card.querySelectorAll("button");
    btnImport.addEventListener("click", () => {
      const r = importMeal(meal);
      if (!r) return;
      alert("Receta importada a 'Mis recetas'.");
      renderMyRecipes();
    });

    btnImportAssign.addEventListener("click", () => {
      const r = importMeal(meal);
      if (!r) return;
      renderMyRecipes();
      // Abrir picker para asignar esta receta rápidamente:
      // Reutilizamos el picker pero prefiltrando (solo esa receta).
      // Mejor: abrir un mini prompt rápido:
      const slot = pickSlotQuick();
      if (!slot) return;
      plan.slots[slot] = r.id;
      savePlan(plan);
      renderWeek();
      alert("Asignada en el calendario.");
    });

    resultsEl.appendChild(card);
  });
}

function pickSlotQuick(){
  // UX simple (sin liarla): pide día y tipo con prompts.
  // Luego lo mejoraremos con un modal bonito.
  const dayIndex = prompt("¿Qué día? 1=Lun ... 7=Dom");
  if (!dayIndex) return null;
  const idx = Number(dayIndex) - 1;
  if (Number.isNaN(idx) || idx < 0 || idx > 6) return null;

  const type = prompt("¿almuerzo o cena? (a/c)");
  if (!type) return null;
  const mealType = type.toLowerCase().startsWith("a") ? "lunch" : "dinner";

  const dayISO = addDaysISO(plan.weekStartISO, idx);
  return `${dayISO}_${mealType}`;
}

// --- IMPORT / RECIPES ---
function importMeal(meal){
  // Evitar duplicados por idMeal
  const existing = recipes.find(r => r.sourceId === meal.idMeal);
  if (existing) return existing;

  const imported = {
    id: cryptoId(),
    source: "TheMealDB",
    sourceId: meal.idMeal,
    name: meal.strMeal,
    ingredients: extractIngredients(meal),
    instructions: meal.strInstructions || "",
    createdAt: Date.now()
  };

  recipes.unshift(imported);
  saveRecipes(recipes);
  return imported;
}

function extractIngredients(meal){
  const list = [];
  for (let i = 1; i <= 20; i++) {
    const ing = (meal[`strIngredient${i}`] || "").trim();
    const mea = (meal[`strMeasure${i}`] || "").trim();
    if (!ing) continue;
    list.push({ name: ing, measure: mea });
  }
  return list;
}

function renderMyRecipes(){
  myRecipesEl.innerHTML = "";

  if (!recipes.length){
    myRecipesEl.innerHTML = `<div class="muted">Aún no tienes recetas. Busca e importa algunas.</div>`;
    return;
  }

  recipes.forEach(r => {
    const row = document.createElement("div");
    row.className = "my-recipe-item";
    row.innerHTML = `
      <div class="left">
        <div><strong>${escapeHtml(r.name)}</strong></div>
        <div class="meta">${r.ingredients.length} ingredientes · ${r.source}</div>
      </div>
      <div class="right">
        <button class="btn" type="button">Asignar…</button>
        <button class="btn danger" type="button">Eliminar</button>
      </div>
    `;

    row.querySelectorAll("button")[0].addEventListener("click", () => {
      // Asignar: el usuario primero clica en un slot en Plan.
      // Aquí abrimos el selector de slot rápido:
      const slot = pickSlotQuick();
      if (!slot) return;
      plan.slots[slot] = r.id;
      savePlan(plan);
      renderWeek();
      alert("Asignada en el calendario.");
    });

    row.querySelectorAll("button")[1].addEventListener("click", () => {
      if (!confirm(`¿Eliminar "${r.name}"?`)) return;
      recipes = recipes.filter(x => x.id !== r.id);
      saveRecipes(recipes);

      // Quitar del plan donde estuviera
      Object.keys(plan.slots).forEach(k => {
        if (plan.slots[k] === r.id) delete plan.slots[k];
      });
      savePlan(plan);

      renderMyRecipes();
      renderWeek();
    });

    myRecipesEl.appendChild(row);
  });
}

clearRecipesBtn.addEventListener("click", () => {
  if (!confirm("¿Borrar TODAS tus recetas guardadas?")) return;
  recipes = [];
  saveRecipes(recipes);
  // limpiar plan también por consistencia
  plan.slots = {};
  savePlan(plan);
  renderMyRecipes();
  renderWeek();
});

exportBtn.addEventListener("click", () => {
  const payload = { recipes, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "meal-planner-recipes.json";
  a.click();
  URL.revokeObjectURL(a.href);
});

importFile.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try{
    const text = await file.text();
    const json = JSON.parse(text);
    if (!json.recipes || !Array.isArray(json.recipes)) throw new Error("Formato inválido");
    // Merge por sourceId si existe, si no por name
    const incoming = json.recipes;
    const map = new Map(recipes.map(r => [r.sourceId || r.name, r]));
    incoming.forEach(r => {
      const key = r.sourceId || r.name;
      if (!map.has(key)) map.set(key, r);
    });
    recipes = Array.from(map.values()).sort((a,b) => (b.createdAt||0)-(a.createdAt||0));
    saveRecipes(recipes);
    renderMyRecipes();
    alert("Importadas.");
  }catch(err){
    console.error(err);
    alert("Error importando JSON.");
  }finally{
    importFile.value = "";
  }
});

// --- SHOPPING LIST ---
regenShopBtn.addEventListener("click", () => {
  const list = generateShoppingFromPlan();
  saveShopChecks({}); // reset checks on regenerate
  renderShoppingList(list);
  // cambiar a tab compra
  activateTab("shop");
});

clearShopChecksBtn.addEventListener("click", () => {
  saveShopChecks({});
  renderShoppingList();
});

function generateShoppingFromPlan(){
  const counts = new Map(); // key: normalized ingredient + measure text
  const plannedIds = Object.values(plan.slots).filter(Boolean);

  plannedIds.forEach(recipeId => {
    const r = recipes.find(x => x.id === recipeId);
    if (!r) return;
    r.ingredients.forEach(ing => {
      const name = normalizeIng(ing.name);
      const measure = (ing.measure || "").trim();
      const key = `${name}__${measure}`;
      const prev = counts.get(key) || { name: ing.name.trim(), measure, qty: 0 };
      prev.qty += 1;
      counts.set(key, prev);
    });
  });

  // Convertimos a lista. Como TheMealDB trae medidas texto, no sumamos gramos; repetimos xN.
  const out = Array.from(counts.values()).map(x => ({
    id: cryptoId(),
    name: x.name,
    measure: x.measure,
    qty: x.qty
  })).sort((a,b) => a.name.localeCompare(b.name));

  // Guardamos la lista actual en memoria (opcional)
  lastGeneratedShopping = out;
  return out;
}

let lastGeneratedShopping = null;

function renderShoppingList(listOverride){
  const list = listOverride || lastGeneratedShopping || generateShoppingFromPlan();
  const checks = loadShopChecks();

  shoppingListEl.innerHTML = "";

  if (!list.length){
    shoppingListEl.innerHTML = `<div class="muted">No hay nada planificado. Ve a “Plan” y asigna comidas.</div>`;
    return;
  }

  list.forEach(item => {
    const row = document.createElement("div");
    row.className = "shop-item";

    const key = shopKey(item);
    const checked = !!checks[key];

    row.innerHTML = `
      <label>
        <input type="checkbox" ${checked ? "checked" : ""} />
        <div>
          <div class="name">${escapeHtml(item.name)}</div>
          <div class="measure">${escapeHtml(formatMeasureQty(item))}</div>
        </div>
      </label>
      <button class="btn danger" type="button">Quitar</button>
    `;

    row.querySelector("input").addEventListener("change", (e) => {
      const c = loadShopChecks();
      if (e.target.checked) c[key] = true;
      else delete c[key];
      saveShopChecks(c);
    });

    row.querySelector("button").addEventListener("click", () => {
      // Quitar del listado generado (no del plan)
      const newList = list.filter(x => shopKey(x) !== key);
      lastGeneratedShopping = newList;
      renderShoppingList(newList);
      // Mantener checks limpios
      const c = loadShopChecks();
      delete c[key];
      saveShopChecks(c);
    });

    shoppingListEl.appendChild(row);
  });
}

function formatMeasureQty(item){
  const m = item.measure ? item.measure : "—";
  return item.qty > 1 ? `${m} ×${item.qty}` : m;
}

function shopKey(item){
  return `${normalizeIng(item.name)}__${(item.measure||"").trim()}`;
}

function normalizeIng(s){
  return (s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

// --- HELPERS: LocalStorage ---
function loadRecipes(){
  try{
    const raw = localStorage.getItem(LS.RECIPES);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  }catch{
    return [];
  }
}

function saveRecipes(arr){
  localStorage.setItem(LS.RECIPES, JSON.stringify(arr));
}

function loadPlan(){
  try{
    const raw = localStorage.getItem(LS.PLAN);
    const obj = raw ? JSON.parse(raw) : null;
    if (!obj || typeof obj !== "object") return { weekStartISO: null, slots: {} };
    if (!obj.slots) obj.slots = {};
    return obj;
  }catch{
    return { weekStartISO: null, slots: {} };
  }
}

function loadPlanForWeek(weekStartISO){
  try{
    const raw = localStorage.getItem(LS.PLAN);
    const obj = raw ? JSON.parse(raw) : null;
    if (!obj || typeof obj !== "object") return null;
    if (obj.weekStartISO !== weekStartISO) return null;
    return obj;
  }catch{
    return null;
  }
}

function savePlan(obj){
  localStorage.setItem(LS.PLAN, JSON.stringify(obj));
}

function loadShopChecks(){
  try{
    const raw = localStorage.getItem(LS.SHOP_CHECKS);
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === "object" ? obj : {};
  }catch{
    return {};
  }
}

function saveShopChecks(obj){
  localStorage.setItem(LS.SHOP_CHECKS, JSON.stringify(obj));
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
  const day = d.getDay(); // 0 Sun..6 Sat
  const diff = (day === 0 ? -6 : 1 - day); // move to Monday
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
  // simple, enough for local
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
