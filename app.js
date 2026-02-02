/***********************
 * Tuppería (v2)
 * - Calendario de 2 semanas (almuerzo/cena)
 * - Lista de la compra con categorías y sugerencias
 ************************/

const LS = {
  PLAN: "mp_plan_v2",
  SHOP_ITEMS: "mp_shop_items_v2",
  CLIENT_ID: "mp_client_id_v2",
  LAST_UPDATED: "mp_last_updated_v2"
};

const DAYS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

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

let isApplyingRemote = false;
let syncTimer = null;
let lastRemoteUpdate = 0;
let lastLocalSync = 0;
let lastLocalUpdate = loadLastUpdated();
let hasRemoteSnapshot = false;
let hasScheduledInitialPush = false;
const clientId = getClientId();
let firestore = null;
let syncDocRef = null;

// --- DOM ---
const tabs = Array.from(document.querySelectorAll(".tab"));
const panels = {
  plan: document.getElementById("tab-plan"),
  shop: document.getElementById("tab-shop"),
};

const weekRangeEl = document.getElementById("weekRange");
const weekGridEl = document.getElementById("weekGrid");
const prevWeekBtn = document.getElementById("prevWeekBtn");
const nextWeekBtn = document.getElementById("nextWeekBtn");
const clearPlanBtn = document.getElementById("clearPlanBtn");
const copyPrevWeekBtn = document.getElementById("copyPrevWeekBtn");

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
const removeFromSlotBtn = document.getElementById("removeFromSlotBtn");
const slotTextInput = document.getElementById("slotTextInput");
const slotIngredientsInput = document.getElementById("slotIngredientsInput");
const slotSaveBtn = document.getElementById("slotSaveBtn");

// --- STATE ---
let planState = loadPlanState();
let shoppingItems = loadShoppingItems();
let pickerContext = null; // { slotId, dayISO, mealType }

// --- INIT ---
initTabs();
ensurePlanWeekStart();
initFirebaseSync();
registerServiceWorker();
renderWeek();
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

  const ingredientsCount = slotData.ingredients?.length || 0;
  const meta = ingredientsCount ? `${ingredientsCount} ingredientes` : null;
  return { title: escapeHtml(slotData.value || "(sin título)"), isEmpty: false, meta };
}

function openPicker(ctx){
  pickerContext = ctx;
  const existingSlot = getSlot(ctx.dayISO, ctx.mealType);
  pickerKicker.textContent = `${formatDateLong(ctx.dayISO)} · ${ctx.mealType === "lunch" ? "Almuerzo" : "Cena"}`;
  slotTextInput.value = existingSlot?.type === "text" ? existingSlot.value : "";
  slotIngredientsInput.value = existingSlot?.ingredients?.map(ing => ing.name).join(", ") || "";
  pickerDialog.showModal();
}

slotSaveBtn.addEventListener("click", () => {
  if (!pickerContext) return;
  const title = slotTextInput.value.trim();
  if (!title){
    alert("Escribe el nombre del plato para guardar.");
    return;
  }
  setSlot(pickerContext.dayISO, pickerContext.mealType, {
    type: "text",
    value: title,
    ingredients: parseIngredients(slotIngredientsInput.value)
  });
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

function parseIngredients(raw){
  return raw
    .split(/,|\n/)
    .map(item => item.trim())
    .filter(Boolean)
    .map(name => ({ name }));
}

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
      if (!slot || slot.type !== "text" || !slot.ingredients?.length) return;
      slot.ingredients.forEach(ing => {
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
  if (!firebase.auth){
    console.warn("Firebase Auth no está disponible. Revisa los scripts de Firebase.");
    return;
  }
  const auth = firebase.auth();
  auth.onAuthStateChanged((user) => {
    if (!user) return;
    setupFirestoreSync();
  });
  auth.signInAnonymously().catch((error) => {
    console.warn("No se pudo iniciar sesión anónima.", error);
  });
}

function setupFirestoreSync(){
  if (firestore && syncDocRef) return;
  firestore = firebase.firestore();
  syncDocRef = firestore.collection("mealPlanner").doc(window.FIREBASE_SYNC_DOC || "default");

  syncDocRef.onSnapshot((snap) => {
    const data = snap.data();
    const remoteUpdatedAt = getRemoteTimestamp(data?.updatedAt);
    if (!hasRemoteSnapshot){
      hasRemoteSnapshot = true;
      if (!data?.payload && hasLocalData() && !hasScheduledInitialPush){
        hasScheduledInitialPush = true;
        scheduleSync();
      }
    }
    if (!data?.payload) return;
    if (data.updatedBy === clientId){
      if (remoteUpdatedAt && remoteUpdatedAt > lastRemoteUpdate){
        lastRemoteUpdate = remoteUpdatedAt;
      }
      return;
    }
    if (remoteUpdatedAt && remoteUpdatedAt <= lastRemoteUpdate) return;
    lastRemoteUpdate = remoteUpdatedAt || lastRemoteUpdate;
    applyRemoteState(data, remoteUpdatedAt || Date.now());
  });
}

function applyRemoteState(data, remoteUpdatedAt){
  if (!data?.payload) return;
  isApplyingRemote = true;
  const payload = data.payload;

  if (payload.planState?.entries){
    planState = payload.planState;
    savePlanState(planState);
  }
  if (Array.isArray(payload.shoppingItems)){
    shoppingItems = payload.shoppingItems;
    saveShoppingItems(shoppingItems);
  }

  renderWeek();
  renderShoppingList();
  if (remoteUpdatedAt){
    setLastUpdated(remoteUpdatedAt);
  }
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
    planState,
    shoppingItems
  };
  lastLocalSync = Date.now();
  syncDocRef
    .set({
      payload,
      updatedAt: Date.now(),
      updatedBy: clientId
    })
    .catch((error) => {
      console.warn("No se pudo sincronizar con Firestore.", error);
    });
}

// --- STORAGE ---
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
      entries[dayISO][mealType] = { type: "text", value: "Receta guardada", ingredients: [] };
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

function getRemoteTimestamp(updatedAt){
  if (!updatedAt) return 0;
  if (typeof updatedAt === "number") return updatedAt;
  if (typeof updatedAt.toMillis === "function") return updatedAt.toMillis();
  return 0;
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

function hasLocalData(){
  return Object.keys(planState.entries || {}).length > 0 || shoppingItems.length > 0;
}
