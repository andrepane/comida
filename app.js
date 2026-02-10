import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCvxpyyTZvVYhXX8MrtJ1PORMMKMJHD18M",
  authDomain: "comida-fbfbd.firebaseapp.com",
  projectId: "comida-fbfbd",
  storageBucket: "comida-fbfbd.firebasestorage.app",
  messagingSenderId: "1074209619328",
  appId: "1:1074209619328:web:02b030bdec0bc599579565"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const calendarGrid = document.getElementById("calendarGrid");
const prevWeekBtn = document.getElementById("prevWeek");
const nextWeekBtn = document.getElementById("nextWeek");
const todayBtn = document.getElementById("today");
const syncStatus = document.getElementById("syncStatus");
const rangeTitle = document.getElementById("rangeTitle");
const rangeSubtitle = document.getElementById("rangeSubtitle");
const shoppingForm = document.getElementById("shoppingForm");
const shoppingInput = document.getElementById("shoppingInput");
const shoppingList = document.getElementById("shoppingList");
const shoppingEmpty = document.getElementById("shoppingEmpty");
const shoppingSuggestions = document.getElementById("shoppingSuggestions");
const shoppingSuggestionsList = document.getElementById("shoppingSuggestionsList");
const shoppingSuggestionsEmpty = document.getElementById("shoppingSuggestionsEmpty");
const recipesForm = document.getElementById("recipesForm");
const recipesInput = document.getElementById("recipesInput");
const recipeIngredientInput = document.getElementById("recipeIngredientInput");
const recipeIngredientAdd = document.getElementById("recipeIngredientAdd");
const recipeIngredientsList = document.getElementById("recipeIngredientsList");
const recipesSearchInput = document.getElementById("recipesSearchInput");
const recipesList = document.getElementById("recipesList");
const recipesEmpty = document.getElementById("recipesEmpty");
const recipesSearchEmpty = document.getElementById("recipesSearchEmpty");
const viewButtons = document.querySelectorAll(".switch-btn");
const viewPanels = document.querySelectorAll(".view-panel");
const statusBadge = document.querySelector(".status-badge");
const themeToggle = document.getElementById("themeToggle");
const emptyDaysPill = document.getElementById("emptyDaysPill");
const remoteNotice = document.getElementById("remoteNotice");
const menuToggle = document.getElementById("menuToggle");
const menuClose = document.getElementById("menuClose");
const menuBackdrop = document.getElementById("menuBackdrop");
const clearCheckedBtn = document.getElementById("clearChecked");
const collapseAllBtn = document.getElementById("collapseAllCategories");

const SHARED_CALENDAR_ID = "calendario-compartido";
const SHOPPING_CATEGORIES = [
  { id: "carne", label: "Carne" },
  { id: "pescado", label: "Pescado" },
  { id: "fruta-verdura", label: "Fruta y verdura" },
  { id: "hidratos", label: "Hidratos" },
  { id: "lacteos", label: "Lácteos" },
  { id: "congelados", label: "Congelados" },
  { id: "bebidas", label: "Bebidas" },
  { id: "desayuno", label: "Desayuno" },
  { id: "higiene", label: "Higiene" },
  { id: "snacks", label: "Snacks" },
  { id: "despensa", label: "Despensa" },
  { id: "otros", label: "Otros" }
];

const categoryIcons = {
  carne: "fa-drumstick-bite",
  pescado: "fa-fish",
  "fruta-verdura": "fa-apple-whole",
  hidratos: "fa-bread-slice",
  lacteos: "fa-cheese",
  despensa: "fa-jar",
  bebidas: "fa-bottle-water",
  snacks: "fa-cookie-bite",
  limpieza: "fa-soap",
  otros: "fa-box",
  congelados: "fa-ice-cream"
};

const weekdayFormatter = new Intl.DateTimeFormat("es-ES", { weekday: "long" });
const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short"
});
const rangeFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "long",
  year: "numeric"
});

const DUPLICATE_INGREDIENT_CHOICE_KEY = "duplicateIngredientsChoice";

const state = {
  calendarId: SHARED_CALENDAR_ID,
  currentMonday: getMonday(new Date()),
  userId: null,
  unsubscribes: new Map(),
  timers: new Map(),
  flashTimers: new Map(),
  customCategories: {},
  customCategoriesUnsubscribe: null,
  customCategoriesSaveTimer: null,
  shoppingItemsUnsubscribe: null,
  shoppingItemsSaveTimer: null,
  shoppingItemsLocalUpdatedAt: null,
  shoppingSuggestionsUnsubscribe: null,
  shoppingSuggestionsSaveTimer: null,
  shoppingSuggestions: new Map(),
  recipesUnsubscribe: null,
  recipesSaveTimer: null,
  recipesFilter: "",
  dayElements: new Map(),
  activeRecipeModal: null,
  activeAppModal: null,
  duplicateIngredientChoice: loadDuplicateIngredientChoice(),
  pendingSaves: 0,
  inFlight: 0,
  lastError: null,
  remoteNoticeTimer: null,
  seenDays: new Set()
};

function loadDuplicateIngredientChoice() {
  try {
    const storedChoice = localStorage.getItem(DUPLICATE_INGREDIENT_CHOICE_KEY);
    return storedChoice === "skip" || storedChoice === "all" ? storedChoice : null;
  } catch {
    return null;
  }
}

function persistDuplicateIngredientChoice(choice) {
  if (choice !== "skip" && choice !== "all") return;
  try {
    localStorage.setItem(DUPLICATE_INGREDIENT_CHOICE_KEY, choice);
  } catch {
    // Ignore localStorage errors and continue with in-memory state.
  }
}

function removeDuplicateIngredientChoice() {
  try {
    localStorage.removeItem(DUPLICATE_INGREDIENT_CHOICE_KEY);
  } catch {
    // Ignore localStorage errors and continue with in-memory state.
  }
}

function closeAppModal({ action = "cancel" } = {}) {
  const activeModal = state.activeAppModal;
  if (!activeModal) return;
  const { overlay, resolve, returnFocusEl } = activeModal;
  state.activeAppModal = null;
  overlay.remove();
  document.body.classList.remove("has-app-modal");
  if (returnFocusEl && typeof returnFocusEl.focus === "function") {
    returnFocusEl.focus();
  }
  resolve(action);
}

function showActionModal({ title, message, actions = [], showRememberChoice = false }) {
  if (state.activeAppModal) {
    closeAppModal({ action: "cancel" });
  }

  return new Promise((resolve) => {
    const returnFocusEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overlay = document.createElement("div");
    overlay.className = "app-modal-overlay";
    overlay.setAttribute("role", "presentation");

    const modal = document.createElement("div");
    modal.className = "app-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");

    const titleId = `app-modal-title-${Date.now()}`;
    const messageId = `app-modal-description-${Date.now()}`;
    modal.setAttribute("aria-labelledby", titleId);
    modal.setAttribute("aria-describedby", messageId);

    const heading = document.createElement("h3");
    heading.id = titleId;
    heading.className = "app-modal__title";
    heading.textContent = title;

    const description = document.createElement("p");
    description.id = messageId;
    description.className = "app-modal__text";
    description.textContent = message;

    const actionsRow = document.createElement("div");
    actionsRow.className = "app-modal__actions";

    let rememberChoiceInput = null;
    if (showRememberChoice) {
      const rememberChoiceLabel = document.createElement("label");
      rememberChoiceLabel.className = "app-modal__remember";
      rememberChoiceInput = document.createElement("input");
      rememberChoiceInput.type = "checkbox";
      rememberChoiceInput.value = "remember";
      const rememberChoiceText = document.createElement("span");
      rememberChoiceText.textContent = "Recordar mi elección";
      rememberChoiceLabel.append(rememberChoiceInput, rememberChoiceText);
      modal.append(heading, description, rememberChoiceLabel, actionsRow);
    } else {
      modal.append(heading, description, actionsRow);
    }

    actions.forEach((action, index) => {
      const actionButton = document.createElement("button");
      actionButton.type = "button";
      actionButton.className = action.className || "btn ghost";
      actionButton.textContent = action.label;
      actionButton.addEventListener("click", () => {
        if (rememberChoiceInput?.checked && (action.value === "skip" || action.value === "all")) {
          state.duplicateIngredientChoice = action.value;
          persistDuplicateIngredientChoice(action.value);
        } else if (rememberChoiceInput?.checked) {
          state.duplicateIngredientChoice = null;
          removeDuplicateIngredientChoice();
        }
        closeAppModal({ action: action.value });
      });
      actionsRow.append(actionButton);
      if (index === 0) {
        requestAnimationFrame(() => actionButton.focus());
      }
    });

    overlay.append(modal);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        closeAppModal({ action: "cancel" });
      }
    });

    document.body.append(overlay);
    document.body.classList.add("has-app-modal");
    state.activeAppModal = { overlay, resolve, returnFocusEl };
  });
}

function getMonday(date) {
  const copy = new Date(date);
  const day = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function formatDateId(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDayName(date) {
  const label = weekdayFormatter.format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function updateStatus() {
  if (!state.userId) {
    syncStatus.textContent = "Preparando…";
    setStatusBadge("is-preparing");
    return;
  }
  if (!navigator.onLine) {
    syncStatus.textContent = "Sin conexión";
    setStatusBadge("is-offline");
    return;
  }
  if (state.lastError) {
    syncStatus.textContent = "Problemas al guardar";
    setStatusBadge("is-error");
    return;
  }
  if (state.pendingSaves > 0 || state.inFlight > 0) {
    syncStatus.textContent = "Guardando…";
    setStatusBadge("is-saving");
  } else {
    syncStatus.textContent = "Guardado";
    setStatusBadge("is-saved");
  }
}

function setStatusBadge(statusClass) {
  if (!statusBadge) return;
  statusBadge.classList.remove("is-preparing", "is-saving", "is-saved", "is-offline", "is-error");
  statusBadge.classList.add(statusClass);
}

function handleConnectivity() {
  updateStatus();
}

function resetListeners() {
  state.unsubscribes.forEach((unsubscribe) => unsubscribe());
  state.unsubscribes.clear();
  state.seenDays.clear();
}

function resetTimers() {
  state.timers.forEach((timer) => clearTimeout(timer));
  state.timers.clear();
  state.flashTimers.forEach((timer) => clearTimeout(timer));
  state.flashTimers.clear();
  state.pendingSaves = 0;
  state.inFlight = 0;
}

function buildCalendar() {
  calendarGrid.innerHTML = "";
  state.dayElements.clear();

  for (let i = 0; i < 14; i += 1) {
    const date = new Date(state.currentMonday);
    date.setDate(state.currentMonday.getDate() + i);

    const dateId = formatDateId(date);
    const card = document.createElement("article");
    card.className = "day-card";
    card.dataset.dateId = dateId;
    if (formatDateId(new Date()) === dateId) {
      card.classList.add("is-today");
    }

    const header = document.createElement("header");
    const title = document.createElement("div");
    const dayName = document.createElement("h3");
    dayName.textContent = formatDayName(date);
    const dateLabel = document.createElement("div");
    dateLabel.className = "date";
    dateLabel.textContent = dateFormatter.format(date);
    title.append(dayName, dateLabel);

    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "btn ghost";
    clearBtn.textContent = "Limpiar";
    header.append(title, clearBtn);

    const statusRow = document.createElement("div");
    statusRow.className = "day-status";

    const lunchStatus = document.createElement("span");
    lunchStatus.className = "day-chip";
    lunchStatus.textContent = "Comida";

    const dinnerStatus = document.createElement("span");
    dinnerStatus.className = "day-chip";
    dinnerStatus.textContent = "Cena";

    statusRow.append(lunchStatus, dinnerStatus);

    const lunchField = document.createElement("div");
    lunchField.className = "field";
    const lunchLabel = document.createElement("label");
    lunchLabel.textContent = "Comida";
    const lunchInput = document.createElement("input");
    lunchInput.type = "text";
    lunchInput.placeholder = "Ej: Ensalada rápida";
    lunchField.append(lunchLabel, lunchInput);

    const dinnerField = document.createElement("div");
    dinnerField.className = "field";
    const dinnerLabel = document.createElement("label");
    dinnerLabel.textContent = "Cena";
    const dinnerInput = document.createElement("input");
    dinnerInput.type = "text";
    dinnerInput.placeholder = "Ej: Pasta al horno";
    dinnerField.append(dinnerLabel, dinnerInput);

    card.append(header, statusRow, lunchField, dinnerField);
    calendarGrid.append(card);

    state.dayElements.set(dateId, {
      lunchInput,
      dinnerInput,
      clearBtn,
      lunchStatus,
      dinnerStatus,
      card
    });

    lunchInput.addEventListener("input", () => {
      updateDayState(dateId, lunchInput.value, dinnerInput.value);
      scheduleSave(dateId);
    });
    dinnerInput.addEventListener("input", () => {
      updateDayState(dateId, lunchInput.value, dinnerInput.value);
      scheduleSave(dateId);
    });
    clearBtn.addEventListener("click", () => {
      lunchInput.value = "";
      dinnerInput.value = "";
      updateDayState(dateId, "", "");
      scheduleSave(dateId, true);
    });
    updateDayState(dateId, "", "");
  }

  updateRangeLabels();
  updateEmptyDaysCount();
  if (state.userId) {
    attachListeners();
  }
}

function updateRangeLabels() {
  const endDate = new Date(state.currentMonday);
  endDate.setDate(state.currentMonday.getDate() + 13);
  rangeTitle.textContent = `Desde ${rangeFormatter.format(state.currentMonday)}`;
  rangeSubtitle.textContent = `Hasta ${rangeFormatter.format(endDate)}`;
}

function attachListeners() {
  resetListeners();
  state.dayElements.forEach((_elements, dateId) => {
    const docRef = doc(db, "calendars", state.calendarId, "days", dateId);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      const data = snapshot.data();
      if (!data) {
        updateInputs(dateId, "", "");
        return;
      }
      if (state.seenDays.has(dateId) && data.updatedBy && data.updatedBy !== state.userId) {
        notifyRemoteChange(dateId);
      }
      state.seenDays.add(dateId);
      updateInputs(dateId, data.lunch || "", data.dinner || "");
    });
    state.unsubscribes.set(dateId, unsubscribe);
  });
}

function updateInputs(dateId, lunchValue, dinnerValue) {
  const elements = state.dayElements.get(dateId);
  if (!elements) return;
  const card = elements.lunchInput.closest(".day-card");
  const shouldFlash =
    (document.activeElement !== elements.lunchInput && lunchValue !== elements.lunchInput.value) ||
    (document.activeElement !== elements.dinnerInput && dinnerValue !== elements.dinnerInput.value);

  if (document.activeElement !== elements.lunchInput) {
    elements.lunchInput.value = lunchValue;
  }
  if (document.activeElement !== elements.dinnerInput) {
    elements.dinnerInput.value = dinnerValue;
  }

  if (card && shouldFlash) {
    triggerFlash(card, dateId);
  }

  updateDayState(dateId, lunchValue, dinnerValue);
}

function triggerFlash(card, dateId) {
  if (state.flashTimers.has(dateId)) {
    clearTimeout(state.flashTimers.get(dateId));
  }
  card.classList.remove("is-flash");
  requestAnimationFrame(() => {
    card.classList.add("is-flash");
  });
  const timer = setTimeout(() => {
    card.classList.remove("is-flash");
    state.flashTimers.delete(dateId);
  }, 300);
  state.flashTimers.set(dateId, timer);
}

function scheduleSave(dateId, immediate = false) {
  if (state.timers.has(dateId)) {
    clearTimeout(state.timers.get(dateId));
  } else {
    state.pendingSaves += 1;
  }
  updateStatus();

  const timer = setTimeout(() => {
    state.timers.delete(dateId);
    state.pendingSaves = Math.max(0, state.pendingSaves - 1);
    saveDay(dateId);
  }, immediate ? 0 : 500);

  state.timers.set(dateId, timer);
}

async function saveDay(dateId) {
  if (!state.userId || !state.calendarId) return;
  const elements = state.dayElements.get(dateId);
  if (!elements) return;

  state.inFlight += 1;
  state.lastError = null;
  updateStatus();
  const docRef = doc(db, "calendars", state.calendarId, "days", dateId);

  try {
    await setDoc(
      docRef,
      {
        lunch: elements.lunchInput.value.trim(),
        dinner: elements.dinnerInput.value.trim(),
        updatedAt: serverTimestamp(),
        updatedBy: state.userId
      },
      { merge: true }
    );
    state.lastError = null;
  } catch {
    state.lastError = "No se pudo guardar. Se reintentará al volver online.";
  } finally {
    state.inFlight = Math.max(0, state.inFlight - 1);
    updateStatus();
  }
}

function changeWeek(offset) {
  const newDate = new Date(state.currentMonday);
  newDate.setDate(state.currentMonday.getDate() + offset * 7);
  state.currentMonday = getMonday(newDate);
  buildCalendar();
}

function jumpToToday() {
  state.currentMonday = getMonday(new Date());
  buildCalendar();
}

function initCalendar() {
  resetTimers();
  buildCalendar();
  updateStatus();
}

function normalizeText(value) {
  return value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

const CUSTOM_CATEGORIES_KEY = "customCategories";
const CUSTOM_CATEGORIES_DOC_ID = "customCategories";
const SHOPPING_ITEMS_KEY = "shoppingItems";
const SHOPPING_ITEMS_DOC_ID = "items";
const SHOPPING_SUGGESTIONS_KEY = "shoppingSuggestions";
const SHOPPING_SUGGESTIONS_DOC_ID = "suggestions";
const RECIPES_KEY = "recipes";
const RECIPES_DOC_ID = "items";
const SHOPPING_SUGGESTIONS_LIMIT = 8;

function loadCustomCategories() {
  try {
    const stored = localStorage.getItem(CUSTOM_CATEGORIES_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveCustomCategories(categories) {
  localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(categories));
}

state.customCategories = loadCustomCategories();

function applyCustomCategories(categories) {
  state.customCategories = { ...categories };
  saveCustomCategories(state.customCategories);
}

function getCustomCategoriesDocRef() {
  return doc(db, "calendars", state.calendarId, "shopping", CUSTOM_CATEGORIES_DOC_ID);
}

function getShoppingItemsDocRef() {
  return doc(db, "calendars", state.calendarId, "shopping", SHOPPING_ITEMS_DOC_ID);
}

function getShoppingSuggestionsDocRef() {
  return doc(db, "calendars", state.calendarId, "shopping", SHOPPING_SUGGESTIONS_DOC_ID);
}

function getRecipesDocRef() {
  return doc(db, "calendars", state.calendarId, "recipes", RECIPES_DOC_ID);
}

function generateRecipeId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `recipe-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeRecipeIngredients(ingredients) {
  if (!Array.isArray(ingredients)) return [];
  return ingredients
    .map((ingredient) => ({
      label: ingredient?.label?.trim() ?? "",
      categoryId: ingredient?.categoryId || "",
      includeInShopping: ingredient?.includeInShopping !== false
    }))
    .filter((ingredient) => ingredient.label);
}

function serializeRecipesForCompare(recipes) {
  if (!Array.isArray(recipes)) return "[]";
  return JSON.stringify(
    recipes.map((recipe) => ({
      id: recipe?.id ?? "",
      title: recipe?.title?.trim() ?? "",
      ingredients: normalizeRecipeIngredients(recipe?.ingredients)
    }))
  );
}

function getRecipeIngredientCategoryId(label, categoryId) {
  return categoryId || getCustomCategory(label) || getShoppingCategory(label);
}

function buildRecipeIngredientItem(ingredient, options = {}) {
  const { onRemove, onCategoryChange, onToggleInclude } = options;
  const item = document.createElement("li");
  item.className = "recipe-ingredient";

  const label = document.createElement("span");
  label.className = "recipe-ingredient__label";
  label.textContent = ingredient.label;

  const categoryId = getRecipeIngredientCategoryId(ingredient.label, ingredient.categoryId);
  item.dataset.category = categoryId;
  const isIncluded = ingredient.includeInShopping !== false;
  item.dataset.includeInShopping = String(isIncluded);
  item.classList.toggle("is-excluded", !isIncluded);
  item.classList.toggle("is-included", isIncluded);

  const categoryLabel = document.createElement("span");
  categoryLabel.className = "recipe-ingredient__category-label";
  categoryLabel.textContent = getCategoryMeta(categoryId).label;

  const categoryWrapper = document.createElement("label");
  categoryWrapper.className = "recipe-ingredient__category";

  const select = document.createElement("select");
  select.className = "recipe-ingredient__select";
  select.setAttribute("aria-label", "Categoría del ingrediente");
  SHOPPING_CATEGORIES.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.label;
    if (category.id === categoryId) {
      option.selected = true;
    }
    select.append(option);
  });
  select.addEventListener("change", () => {
    const nextCategory = select.value;
    item.dataset.category = nextCategory;
    categoryLabel.textContent = getCategoryMeta(nextCategory).label;
    setCustomCategory(ingredient.label, nextCategory);
    if (onCategoryChange) {
      onCategoryChange(nextCategory);
    }
  });

  categoryWrapper.append(categoryLabel, select);

  const toggleIncludeButton = document.createElement("button");
  toggleIncludeButton.type = "button";
  toggleIncludeButton.className = "recipe-ingredient__toggle";
  toggleIncludeButton.setAttribute("aria-label", "Añadir a la lista de la compra");
  toggleIncludeButton.setAttribute("aria-pressed", String(isIncluded));
  toggleIncludeButton.innerHTML = "<i class=\"fa-solid fa-bag-shopping\" aria-hidden=\"true\"></i>";
  toggleIncludeButton.addEventListener("click", () => {
    const nextIncluded = item.dataset.includeInShopping !== "true";
    item.dataset.includeInShopping = String(nextIncluded);
    item.classList.toggle("is-excluded", !nextIncluded);
    item.classList.toggle("is-included", nextIncluded);
    toggleIncludeButton.setAttribute("aria-pressed", String(nextIncluded));
    if (onToggleInclude) {
      onToggleInclude(nextIncluded);
    }
  });

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "recipe-ingredient__remove";
  removeButton.setAttribute("aria-label", "Quitar ingrediente");
  removeButton.textContent = "✕";
  removeButton.addEventListener("click", () => {
    item.remove();
    if (onRemove) {
      onRemove();
    }
  });

  item.append(label, categoryWrapper, toggleIncludeButton, removeButton);
  return item;
}

function addRecipeIngredientToDraft(ingredient) {
  if (!recipeIngredientsList) return;
  const item = buildRecipeIngredientItem(ingredient);
  recipeIngredientsList.append(item);
}

function getRecipeIngredientsFromList(listElement) {
  if (!listElement) return [];
  return Array.from(listElement.querySelectorAll(".recipe-ingredient")).map((item) => ({
    label: item.querySelector(".recipe-ingredient__label")?.textContent?.trim() ?? "",
    categoryId: item.dataset.category || "",
    includeInShopping: item.dataset.includeInShopping !== "false"
  })).filter((ingredient) => ingredient.label);
}

function refreshRecipeIngredientsEmptyState(listElement) {
  if (!listElement) return;
  const hasIngredients = listElement.querySelector(".recipe-ingredient:not(.is-empty)");
  const emptyItem = listElement.querySelector(".recipe-ingredient.is-empty");
  if (hasIngredients) {
    if (emptyItem) emptyItem.remove();
    return;
  }
  if (!emptyItem) {
    const placeholder = document.createElement("li");
    placeholder.className = "recipe-ingredient is-empty";
    placeholder.textContent = "Sin ingredientes guardados.";
    listElement.append(placeholder);
  }
}

function clearRecipeIngredientsDraft() {
  if (!recipeIngredientsList) return;
  recipeIngredientsList.innerHTML = "";
}

function loadRecipes() {
  try {
    const stored = localStorage.getItem(RECIPES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecipes(recipes) {
  localStorage.setItem(RECIPES_KEY, JSON.stringify(recipes));
}

function getRecipesFromDom() {
  if (!recipesList) return [];
  return Array.from(recipesList.querySelectorAll(".recipe-item")).map((item) => ({
    id: item.dataset.recipeId || generateRecipeId(),
    title: item.querySelector(".recipe-title")?.textContent?.trim() ?? "",
    ingredients: getRecipeIngredientsFromList(item.querySelector(".recipe-ingredients__list"))
  })).filter((recipe) => recipe.title);
}

function persistRecipes({ syncRemote = true } = {}) {
  const recipes = getRecipesFromDom();
  saveRecipes(recipes);
  if (syncRemote) {
    scheduleRecipesSave();
  }
}

function scheduleRecipesSave() {
  if (!state.userId) return;
  if (state.recipesSaveTimer) {
    clearTimeout(state.recipesSaveTimer);
  }
  state.recipesSaveTimer = setTimeout(() => {
    state.recipesSaveTimer = null;
    saveRecipesRemote();
  }, 400);
}

async function saveRecipesRemote() {
  if (!state.userId || !state.calendarId) return;
  const docRef = getRecipesDocRef();
  const recipes = loadRecipes();
  try {
    await setDoc(
      docRef,
      {
        recipes,
        updatedAt: serverTimestamp(),
        updatedBy: state.userId
      },
      { merge: true }
    );
  } catch {
    // Silencioso: los cambios locales ya están guardados y se reintentarán.
  }
}

function replaceRecipes(recipes) {
  if (!recipesList) return;
  const activeRecipeId = state.activeRecipeModal?.dataset?.recipeId ?? null;
  recipesList.innerHTML = "";
  recipes.forEach((recipe) => {
    if (recipe?.title) {
      addRecipeItem(recipe, { shouldPersist: false });
    }
  });
  updateRecipesEmptyState();
  persistRecipes({ syncRemote: false });
  if (activeRecipeId) {
    const nextActive = Array.from(recipesList.querySelectorAll(".recipe-item"))
      .find((item) => item.dataset.recipeId === activeRecipeId);
    if (nextActive) {
      openRecipeModal(nextActive);
    }
  }
}

function initRecipesSync() {
  if (!state.userId || !state.calendarId) return;
  if (state.recipesUnsubscribe) {
    state.recipesUnsubscribe();
  }
  const docRef = getRecipesDocRef();
  state.recipesUnsubscribe = onSnapshot(docRef, (snapshot) => {
    const data = snapshot.data();
    if (!data?.recipes) {
      const localRecipes = loadRecipes();
      if (localRecipes.length) {
        saveRecipesRemote();
      }
      return;
    }
    const localSerialized = serializeRecipesForCompare(loadRecipes());
    const remoteSerialized = serializeRecipesForCompare(data.recipes);
    if (localSerialized === remoteSerialized) {
      return;
    }
    replaceRecipes(data.recipes);
  });
}

function loadShoppingItems() {
  try {
    const stored = localStorage.getItem(SHOPPING_ITEMS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveShoppingItems(items) {
  localStorage.setItem(SHOPPING_ITEMS_KEY, JSON.stringify(items));
}

function loadShoppingSuggestions() {
  try {
    const stored = localStorage.getItem(SHOPPING_SUGGESTIONS_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(parsed)) return new Map();
    const map = new Map();
    parsed.forEach((suggestion) => {
      if (!suggestion?.label) return;
      const normalized = normalizeText(suggestion.label);
      if (!normalized) return;
      const count = Number.isFinite(suggestion.count) ? suggestion.count : 0;
      const lastAdded = Number.isFinite(suggestion.lastAdded) ? suggestion.lastAdded : 0;
      map.set(normalized, {
        label: suggestion.label,
        count: Math.max(0, count),
        lastAdded
      });
    });
    return map;
  } catch {
    return new Map();
  }
}

function saveShoppingSuggestions(suggestions) {
  const stored = Array.from(suggestions.values());
  localStorage.setItem(SHOPPING_SUGGESTIONS_KEY, JSON.stringify(stored));
}

state.shoppingSuggestions = loadShoppingSuggestions();

function getShoppingItemsFromDom() {
  if (!shoppingList) return [];
  return Array.from(shoppingList.querySelectorAll(".shopping-item")).map((item) => ({
    label: item.querySelector(".shopping-item__label")?.textContent ?? "",
    categoryId: item.dataset.category || "otros",
    checked: item.classList.contains("is-checked")
  }));
}

function serializeShoppingItems(items) {
  return JSON.stringify(
    items.map((item) => ({
      label: item.label ?? "",
      categoryId: item.categoryId ?? "otros",
      checked: Boolean(item.checked)
    }))
  );
}

function serializeShoppingSuggestions(suggestions) {
  const list = Array.from(suggestions.entries())
    .map(([key, value]) => ({
      key,
      label: value.label,
      count: value.count,
      lastAdded: value.lastAdded
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
  return JSON.stringify(list);
}

function getShoppingSuggestions() {
  return Array.from(state.shoppingSuggestions.values())
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.lastAdded - a.lastAdded;
    })
    .slice(0, SHOPPING_SUGGESTIONS_LIMIT);
}

function renderShoppingSuggestions() {
  if (!shoppingSuggestionsList || !shoppingSuggestionsEmpty) return;
  const suggestions = getShoppingSuggestions();
  shoppingSuggestionsList.innerHTML = "";
  if (!suggestions.length) {
    shoppingSuggestionsEmpty.style.display = "block";
    return;
  }
  shoppingSuggestionsEmpty.style.display = "none";
  suggestions.forEach((suggestion) => {
    const item = document.createElement("li");
    item.className = "shopping-suggestions__item";

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "shopping-suggestions__button";
    addButton.setAttribute("aria-label", `Añadir ${suggestion.label}`);
    addButton.textContent = suggestion.label;
    addButton.addEventListener("click", () => {
      const existingItem = findShoppingItemByLabel(suggestion.label);
      if (existingItem) {
        existingItem.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      addShoppingItem(suggestion.label);
    });

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "shopping-suggestions__remove";
    removeButton.setAttribute("aria-label", `Eliminar sugerencia ${suggestion.label}`);
    removeButton.textContent = "×";
    removeButton.addEventListener("click", () => {
      removeShoppingSuggestion(suggestion.label);
    });

    item.append(addButton, removeButton);
    shoppingSuggestionsList.append(item);
  });
}

function recordShoppingSuggestion(label) {
  const trimmedLabel = label.trim();
  if (!trimmedLabel) return;
  const normalized = normalizeText(trimmedLabel);
  if (!normalized) return;
  const current = state.shoppingSuggestions.get(normalized) || {
    label: trimmedLabel,
    count: 0,
    lastAdded: 0
  };
  state.shoppingSuggestions.set(normalized, {
    label: trimmedLabel,
    count: current.count + 1,
    lastAdded: Date.now()
  });
  persistShoppingSuggestions();
  renderShoppingSuggestions();
}

function removeShoppingSuggestion(label) {
  const normalized = normalizeText(label.trim());
  if (!normalized || !state.shoppingSuggestions.has(normalized)) return;
  state.shoppingSuggestions.delete(normalized);
  persistShoppingSuggestions();
  renderShoppingSuggestions();
}

function persistShoppingList({ syncRemote = true, updateTimestamp = true } = {}) {
  if (!shoppingList) return;
  const items = getShoppingItemsFromDom();
  saveShoppingItems(items);
  if (updateTimestamp) {
    state.shoppingItemsLocalUpdatedAt = Date.now();
  }
  if (syncRemote) {
    scheduleShoppingItemsSave();
  }
}

function persistShoppingSuggestions({ syncRemote = true } = {}) {
  saveShoppingSuggestions(state.shoppingSuggestions);
  if (syncRemote) {
    scheduleShoppingSuggestionsSave();
  }
}

function scheduleShoppingItemsSave() {
  if (!state.userId) return;
  if (state.shoppingItemsSaveTimer) {
    clearTimeout(state.shoppingItemsSaveTimer);
  }
  state.shoppingItemsSaveTimer = setTimeout(() => {
    state.shoppingItemsSaveTimer = null;
    saveShoppingItemsRemote();
  }, 400);
}

function scheduleShoppingSuggestionsSave() {
  if (!state.userId) return;
  if (state.shoppingSuggestionsSaveTimer) {
    clearTimeout(state.shoppingSuggestionsSaveTimer);
  }
  state.shoppingSuggestionsSaveTimer = setTimeout(() => {
    state.shoppingSuggestionsSaveTimer = null;
    saveShoppingSuggestionsRemote();
  }, 400);
}

async function saveShoppingItemsRemote() {
  if (!state.userId || !state.calendarId) return;
  const docRef = getShoppingItemsDocRef();
  const items = loadShoppingItems();
  try {
    await setDoc(
      docRef,
      {
        items,
        updatedAt: serverTimestamp(),
        updatedBy: state.userId
      },
      { merge: true }
    );
  } catch {
    // Silencioso: los cambios locales ya están guardados y se reintentarán.
  }
}

async function saveShoppingSuggestionsRemote() {
  if (!state.userId || !state.calendarId) return;
  const docRef = getShoppingSuggestionsDocRef();
  const suggestions = Array.from(state.shoppingSuggestions.values());
  try {
    await setDoc(
      docRef,
      {
        suggestions,
        updatedAt: serverTimestamp(),
        updatedBy: state.userId
      },
      { merge: true }
    );
  } catch {
    // Silencioso: los cambios locales ya están guardados y se reintentarán.
  }
}

function replaceShoppingItems(items, options = {}) {
  if (!shoppingList) return;
  const { updateTimestamp = false, remoteUpdatedAt = 0 } = options;
  shoppingList.innerHTML = "";
  items.forEach((item) => {
    if (item?.label) {
      addShoppingItem(item.label, {
        categoryId: item.categoryId,
        checked: item.checked,
        shouldPersist: false,
        shouldTrackSuggestions: false
      });
    }
  });
  updateShoppingEmptyState();
  persistShoppingList({ syncRemote: false, updateTimestamp: false });
  if (updateTimestamp && Number.isFinite(remoteUpdatedAt) && remoteUpdatedAt > 0) {
    state.shoppingItemsLocalUpdatedAt = remoteUpdatedAt;
  }
}

function applyShoppingSuggestions(suggestions) {
  state.shoppingSuggestions = suggestions;
  saveShoppingSuggestions(state.shoppingSuggestions);
  renderShoppingSuggestions();
}

function getCustomCategory(value) {
  return state.customCategories[normalizeText(value)];
}

function setCustomCategory(value, categoryId) {
  const normalized = normalizeText(value);
  if (state.customCategories[normalized] === categoryId) return;
  state.customCategories = { ...state.customCategories, [normalized]: categoryId };
  saveCustomCategories(state.customCategories);
  scheduleCustomCategoriesSave();
}

function scheduleCustomCategoriesSave() {
  if (!state.userId) return;
  if (state.customCategoriesSaveTimer) {
    clearTimeout(state.customCategoriesSaveTimer);
  }
  state.customCategoriesSaveTimer = setTimeout(() => {
    state.customCategoriesSaveTimer = null;
    saveCustomCategoriesRemote();
  }, 400);
}

async function saveCustomCategoriesRemote() {
  if (!state.userId || !state.calendarId) return;
  const docRef = getCustomCategoriesDocRef();
  try {
    await setDoc(
      docRef,
      {
        categories: state.customCategories,
        updatedAt: serverTimestamp(),
        updatedBy: state.userId
      },
      { merge: true }
    );
  } catch {
    // Silencioso: los cambios locales ya están guardados y se reintentarán.
  }
}

function initCustomCategoriesSync() {
  if (!state.userId || !state.calendarId) return;
  if (state.customCategoriesUnsubscribe) {
    state.customCategoriesUnsubscribe();
  }
  const docRef = getCustomCategoriesDocRef();
  state.customCategoriesUnsubscribe = onSnapshot(docRef, (snapshot) => {
    const data = snapshot.data();
    if (!data?.categories) {
      if (Object.keys(state.customCategories).length) {
        saveCustomCategoriesRemote();
      }
      return;
    }
    applyCustomCategories(data.categories);
  });
}

function initShoppingItemsSync() {
  if (!state.userId || !state.calendarId) return;
  if (state.shoppingItemsUnsubscribe) {
    state.shoppingItemsUnsubscribe();
  }
  const docRef = getShoppingItemsDocRef();
  state.shoppingItemsUnsubscribe = onSnapshot(docRef, (snapshot) => {
    const data = snapshot.data();
    if (!data?.items) {
      const localItems = loadShoppingItems();
      if (localItems.length) {
        saveShoppingItemsRemote();
      }
      return;
    }
    const remoteUpdatedAt =
      data.updatedAt?.toMillis?.() ??
      (Number.isFinite(data.updatedAt?.seconds) ? data.updatedAt.seconds * 1000 : 0);
    const localUpdatedAt = Number.isFinite(state.shoppingItemsLocalUpdatedAt)
      ? state.shoppingItemsLocalUpdatedAt
      : 0;
    const localSerialized = serializeShoppingItems(getShoppingItemsFromDom());
    const remoteSerialized = serializeShoppingItems(data.items);
    if (localSerialized === remoteSerialized) {
      return;
    }
    if (localUpdatedAt && remoteUpdatedAt && remoteUpdatedAt < localUpdatedAt) {
      return;
    }
    replaceShoppingItems(data.items, { updateTimestamp: true, remoteUpdatedAt });
  });
}

function initShoppingSuggestionsSync() {
  if (!state.userId || !state.calendarId) return;
  if (state.shoppingSuggestionsUnsubscribe) {
    state.shoppingSuggestionsUnsubscribe();
  }
  const docRef = getShoppingSuggestionsDocRef();
  state.shoppingSuggestionsUnsubscribe = onSnapshot(docRef, (snapshot) => {
    const data = snapshot.data();
    if (!data?.suggestions) {
      if (state.shoppingSuggestions.size) {
        saveShoppingSuggestionsRemote();
      }
      return;
    }
    const incoming = new Map();
    data.suggestions.forEach((suggestion) => {
      if (!suggestion?.label) return;
      const normalized = normalizeText(suggestion.label);
      if (!normalized) return;
      const count = Number.isFinite(suggestion.count) ? suggestion.count : 0;
      const lastAdded = Number.isFinite(suggestion.lastAdded) ? suggestion.lastAdded : 0;
      incoming.set(normalized, {
        label: suggestion.label,
        count: Math.max(0, count),
        lastAdded
      });
    });
    const localSerialized = serializeShoppingSuggestions(state.shoppingSuggestions);
    const remoteSerialized = serializeShoppingSuggestions(incoming);
    if (localSerialized === remoteSerialized) {
      return;
    }
    applyShoppingSuggestions(incoming);
  });
}

function getShoppingCategory(value) {
  const normalized = normalizeText(value);
  const includesAny = (keywords) => keywords.some((keyword) => normalized.includes(keyword));
  const customCategory = getCustomCategory(value);

  if (customCategory) {
    return customCategory;
  }

  if (includesAny(["carne", "pollo", "ternera", "cerdo", "pavo", "chuleta", "hamburguesa", "jamon", "solomillo"])) {
    return "carne";
  }
  if (includesAny(["pescado", "atun", "salmon", "merluza", "gamba", "gambas", "marisco"])) {
    return "pescado";
  }
  if (includesAny(["manzana", "pera", "platano", "naranja", "fresa", "fruta", "verdura", "lechuga", "tomate", "zanahoria", "pepino", "brocoli", "cebolla", "aguacate", "aguacates", "jengibre", "limón", "limones"])) {
    return "fruta-verdura";
  }
  if (includesAny(["pasta", "arroz", "pan", "patata", "patatas", "cereal", "harina", "avena", "quinoa"])) {
    return "hidratos";
  }
  if (includesAny(["leche", "yogur", "yogurt", "queso", "mantequilla", "nata"])) {
    return "lacteos";
  }
  if (includesAny(["congelado", "helado", "pizza", "verduras congeladas", "croquetas"])) {
    return "congelados";
  }
  if (includesAny(["agua", "zumo", "cerveza", "vino", "refresco", "cola", "cafe", "te", "infusion"])) {
    return "bebidas";
  }
  if (includesAny(["cacao", "cereales", "galletas", "tostadas", "mermelada", "miel", "cafe", "te"])) {
    return "desayuno";
  }
  if (includesAny(["papel", "detergente", "suavizante", "jabon", "champu", "gel", "pasta dientes", "cepillo"])) {
    return "higiene";
  }
  if (includesAny(["snack", "patatas fritas", "frutos secos", "palomitas", "aperitivo", "chocolate"])) {
    return "snacks";
  }
  if (includesAny(["legumbre", "lenteja", "garbanzo", "judia", "conserva", "aceite", "especia", "sal", "azucar", "vinagre"])) {
    return "despensa";
  }
  return "otros";
}

function getCategoryMeta(categoryId) {
  return SHOPPING_CATEGORIES.find((category) => category.id === categoryId) || SHOPPING_CATEGORIES.at(-1);
}

function getCategoryIconClass(categoryId) {
  if (categoryId === "higiene") {
    return categoryIcons.limpieza;
  }
  return categoryIcons[categoryId] ?? categoryIcons.otros;
}

function ensureCategoryGroup(categoryId) {
  const existing = shoppingList.querySelector(`.shopping-category[data-category="${categoryId}"]`);
  if (existing) return existing.querySelector(".shopping-category__list");

  const categoryMeta = getCategoryMeta(categoryId);
  const group = document.createElement("li");
  group.className = "shopping-category";
  group.dataset.category = categoryMeta.id;

  const header = document.createElement("div");
  header.className = "shopping-category__header";

  const title = document.createElement("span");
  title.className = "shopping-category__title";
  title.textContent = categoryMeta.label;

  const count = document.createElement("span");
  count.className = "shopping-category__count";
  count.textContent = "0";

  const headerActions = document.createElement("div");
  headerActions.className = "shopping-category__actions";

  const clearCheckedButton = document.createElement("button");
  clearCheckedButton.type = "button";
  clearCheckedButton.className = "shopping-category__button";
  clearCheckedButton.textContent = "Vaciar comprados";
  clearCheckedButton.addEventListener("click", () => {
    const list = group.querySelector(".shopping-category__list");
    if (!list) return;
    Array.from(list.querySelectorAll(".shopping-item.is-checked")).forEach((item) => item.remove());
    removeCategoryGroupIfEmpty(list);
    refreshCategoryCount(list);
    updateShoppingEmptyState();
    persistShoppingList();
  });

  const toggleButton = document.createElement("button");
  toggleButton.type = "button";
  toggleButton.className = "shopping-category__button";
  toggleButton.textContent = "Colapsar";
  toggleButton.setAttribute("aria-expanded", "true");
  toggleButton.addEventListener("click", () => {
    const isCollapsed = group.classList.toggle("is-collapsed");
    toggleButton.textContent = isCollapsed ? "Expandir" : "Colapsar";
    toggleButton.setAttribute("aria-expanded", String(!isCollapsed));
    persistCategoryCollapse(categoryMeta.id, isCollapsed);
  });

  headerActions.append(clearCheckedButton, toggleButton);

  const accent = document.createElement("span");
  accent.className = "shopping-category__accent";
  accent.setAttribute("aria-hidden", "true");

  header.append(title, count, accent, headerActions);

  const list = document.createElement("ul");
  list.className = "shopping-category__list";

  group.append(header, list);

  if (isCategoryCollapsed(categoryMeta.id)) {
    group.classList.add("is-collapsed");
    toggleButton.textContent = "Expandir";
    toggleButton.setAttribute("aria-expanded", "false");
  }

  const categoryIndex = SHOPPING_CATEGORIES.findIndex((category) => category.id === categoryMeta.id);
  const groups = Array.from(shoppingList.querySelectorAll(".shopping-category"));
  const insertBefore = groups.find((element) => {
    const elementIndex = SHOPPING_CATEGORIES.findIndex(
      (category) => category.id === element.dataset.category
    );
    return elementIndex > categoryIndex;
  });

  if (insertBefore) {
    shoppingList.insertBefore(group, insertBefore);
  } else {
    shoppingList.append(group);
  }

  return list;
}

function removeCategoryGroupIfEmpty(listElement) {
  if (!listElement) return;
  if (listElement.children.length > 0) return;
  const group = listElement.closest(".shopping-category");
  if (group) group.remove();
}

function updateShoppingItemCategory(item, nextCategoryId) {
  if (!item || !nextCategoryId) return;
  const currentCategoryId = item.dataset.category;
  if (currentCategoryId === nextCategoryId) return;

  const categoryMeta = getCategoryMeta(nextCategoryId);
  const targetList = ensureCategoryGroup(categoryMeta.id);
  const currentList = item.closest(".shopping-category")?.querySelector(".shopping-category__list");

  item.dataset.category = categoryMeta.id;
  const categoryLabel = item.querySelector(".shopping-item__category-label");
  if (categoryLabel) {
    categoryLabel.textContent = categoryMeta.label;
  }
  const icon = item.querySelector(".shopping-item__icon");
  if (icon) {
    icon.className = `fa-solid ${getCategoryIconClass(categoryMeta.id)} shopping-item__icon`;
  }

  targetList.append(item);
  removeCategoryGroupIfEmpty(currentList);
  refreshCategoryCount(currentList);
  refreshCategoryCount(targetList);
  updateShoppingEmptyState();
  persistShoppingList();
}

function addShoppingItem(value, options = {}) {
  const {
    categoryId = getShoppingCategory(value),
    checked = false,
    shouldPersist = true,
    shouldTrackSuggestions = true
  } = options;
  const categoryMeta = getCategoryMeta(categoryId);
  const groupList = ensureCategoryGroup(categoryId);

  const item = document.createElement("li");
  item.className = "shopping-item";
  item.dataset.category = categoryMeta.id;

  const label = document.createElement("span");
  label.className = "shopping-item__label";

  const icon = document.createElement("i");
  icon.className = `fa-solid ${getCategoryIconClass(categoryMeta.id)} shopping-item__icon`;
  icon.setAttribute("aria-hidden", "true");

  label.textContent = value;
  label.prepend(icon);

  const categoryButton = document.createElement("label");
  categoryButton.className = "shopping-item__category";

  const categoryLabel = document.createElement("span");
  categoryLabel.className = "shopping-item__category-label";
  categoryLabel.textContent = categoryMeta.label;

  const select = document.createElement("select");
  select.className = "shopping-item__select";
  select.setAttribute("aria-label", "Cambiar categoría");
  SHOPPING_CATEGORIES.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.label;
    if (category.id === categoryMeta.id) {
      option.selected = true;
    }
    select.append(option);
  });

  select.addEventListener("change", () => {
    const nextCategoryId = select.value;
    // Guardamos la preferencia para aprender en el futuro.
    setCustomCategory(value, nextCategoryId);
    updateShoppingItemCategory(item, nextCategoryId);
  });

  categoryButton.append(categoryLabel, select);

  const actions = document.createElement("div");
  actions.className = "shopping-item__actions";

  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.className = "shopping-action check";
  toggleBtn.setAttribute("aria-label", "Marcar como comprado");
  toggleBtn.setAttribute("aria-pressed", "false");
  toggleBtn.textContent = "✓";

  toggleBtn.addEventListener("click", () => {
    const isChecked = item.classList.toggle("is-checked");
    toggleBtn.setAttribute("aria-pressed", String(isChecked));
    refreshCategoryCount(groupList);
    persistShoppingList();
  });

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "shopping-action delete";
  deleteBtn.setAttribute("aria-label", "Eliminar de la lista");
  deleteBtn.textContent = "✕";
  deleteBtn.addEventListener("click", () => {
    item.remove();
    removeCategoryGroupIfEmpty(groupList);
    refreshCategoryCount(groupList);
    updateShoppingEmptyState();
    persistShoppingList();
  });

  actions.append(toggleBtn, deleteBtn);
  item.append(label, categoryButton, actions);
  groupList.append(item);
  if (checked) {
    item.classList.add("is-checked");
    toggleBtn.setAttribute("aria-pressed", "true");
  }
  refreshCategoryCount(groupList);
  updateShoppingEmptyState();
  if (shouldTrackSuggestions) {
    recordShoppingSuggestion(value);
  }
  if (shouldPersist) {
    persistShoppingList();
  }
}

function findShoppingItemByLabel(value) {
  if (!shoppingList) return null;
  const normalizedValue = normalizeText(value.trim());
  if (!normalizedValue) return null;
  return Array.from(shoppingList.querySelectorAll(".shopping-item")).find((item) => {
    const label = item.querySelector(".shopping-item__label")?.textContent ?? "";
    return normalizeText(label.trim()) === normalizedValue;
  });
}

function updateRecipesEmptyState() {
  if (!recipesEmpty || !recipesList) return;
  const totalItems = recipesList.querySelectorAll(".recipe-item").length;
  recipesEmpty.classList.toggle("is-visible", totalItems === 0);
}

function updateRecipesSearchEmptyState() {
  if (!recipesSearchEmpty || !recipesList) return;
  const query = state.recipesFilter?.trim();
  const totalItems = recipesList.querySelectorAll(".recipe-item").length;
  const visibleItems = recipesList.querySelectorAll(".recipe-item:not(.is-hidden)").length;
  const shouldShow = Boolean(query) && totalItems > 0 && visibleItems === 0;
  recipesSearchEmpty.classList.toggle("is-visible", shouldShow);
}

function applyRecipesFilter(rawQuery = recipesSearchInput?.value ?? "") {
  if (!recipesList) return;
  const query = rawQuery.trim().toLowerCase();
  state.recipesFilter = query;
  recipesList.querySelectorAll(".recipe-item").forEach((item) => {
    const title = item.dataset.recipeTitle || "";
    const matches = !query || title.includes(query);
    item.classList.toggle("is-hidden", !matches);
  });
  updateRecipesSearchEmptyState();
}

function isDateInCurrentRange(date) {
  const start = new Date(state.currentMonday);
  const end = new Date(state.currentMonday);
  end.setDate(end.getDate() + 13);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return date >= start && date <= end;
}

function planRecipeForDate({ recipeTitle, dateValue, meal }) {
  const safeDateValue = dateValue || formatDateId(new Date());
  const date = new Date(`${safeDateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return;

  if (!isDateInCurrentRange(date)) {
    state.currentMonday = getMonday(date);
    buildCalendar();
  }

  const dateId = formatDateId(date);
  const elements = state.dayElements.get(dateId);
  if (!elements) return;
  const targetInput = meal === "dinner" ? elements.dinnerInput : elements.lunchInput;
  const currentValue = targetInput.value.trim();
  const nextValue = currentValue ? `${currentValue} + ${recipeTitle}` : recipeTitle;
  targetInput.value = nextValue;
  updateDayState(dateId, elements.lunchInput.value, elements.dinnerInput.value);
  scheduleSave(dateId, true);
  elements.card.scrollIntoView({ behavior: "smooth", block: "center" });
  showCalendarNotice(`Receta añadida a ${formatDayName(date)}.`);
}

async function addRecipeIngredientsToShopping(ingredients) {
  if (!Array.isArray(ingredients) || !ingredients.length) return;
  const existingLabels = new Set(
    Array.from(shoppingList?.querySelectorAll(".shopping-item__label") ?? [])
      .map((item) => item.textContent?.trim().toLowerCase())
      .filter(Boolean)
  );
  const normalizedIngredients = ingredients
    .map((ingredient) => {
      const label = ingredient?.label?.trim();
      if (!label || ingredient.includeInShopping === false) return null;
      return {
        label,
        normalizedLabel: label.toLowerCase(),
        categoryId: getRecipeIngredientCategoryId(label, ingredient.categoryId)
      };
    })
    .filter(Boolean);
  if (!normalizedIngredients.length) return;

  const duplicateLabels = normalizedIngredients
    .filter((ingredient) => existingLabels.has(ingredient.normalizedLabel))
    .map((ingredient) => ingredient.label);
  let includeDuplicates = true;
  if (duplicateLabels.length) {
    let duplicateAction = state.duplicateIngredientChoice;
    if (!duplicateAction) {
      duplicateAction = await showActionModal({
        title: "Ingredientes duplicados",
        message: `Ya existen ${duplicateLabels.length} ingredientes. ¿Qué quieres hacer?`,
        showRememberChoice: true,
        actions: [
          { label: "Omitir duplicados", value: "skip", className: "btn ghost" },
          { label: "Añadir todos", value: "all", className: "btn secondary" },
          { label: "Cancelar", value: "cancel", className: "btn minimal" }
        ]
      });
    }

    if (duplicateAction === "cancel") {
      return;
    }
    includeDuplicates = duplicateAction === "all";
  }

  let addedAny = false;
  normalizedIngredients.forEach((ingredient) => {
    if (!includeDuplicates && existingLabels.has(ingredient.normalizedLabel)) return;
    const label = ingredient?.label?.trim();
    if (!label) return;
    addShoppingItem(label, {
      categoryId: ingredient.categoryId,
      shouldPersist: false
    });
    addedAny = true;
  });
  if (addedAny) {
    persistShoppingList();
  }
}

function closeRecipeModal(item) {
  if (!item) return;
  item.classList.remove("is-open");
  document.body.classList.remove("has-recipe-modal");
  const trigger = item.querySelector(".recipe-card");
  if (trigger) {
    trigger.setAttribute("aria-expanded", "false");
  }
  if (state.activeRecipeModal === item) {
    state.activeRecipeModal = null;
  }
}

function openRecipeModal(item) {
  if (!item) return;
  if (state.activeRecipeModal && state.activeRecipeModal !== item) {
    closeRecipeModal(state.activeRecipeModal);
  }
  item.classList.add("is-open");
  document.body.classList.add("has-recipe-modal");
  const trigger = item.querySelector(".recipe-card");
  if (trigger) {
    trigger.setAttribute("aria-expanded", "true");
  }
  state.activeRecipeModal = item;
}

function addRecipeItem(recipe, options = {}) {
  if (!recipesList) return;
  const { shouldPersist = true } = options;
  const recipeIngredients = normalizeRecipeIngredients(recipe.ingredients);
  const item = document.createElement("li");
  item.className = "recipe-item";
  item.dataset.recipeId = recipe.id;
  item.dataset.recipeTitle = recipe.title.toLowerCase();

  const card = document.createElement("button");
  card.type = "button";
  card.className = "recipe-card";
  card.setAttribute("aria-haspopup", "dialog");
  card.setAttribute("aria-expanded", "false");

  const cardMedia = document.createElement("div");
  cardMedia.className = "recipe-card__media";
  const cardIcon = document.createElement("span");
  cardIcon.className = "recipe-card__icon";
  cardIcon.setAttribute("aria-hidden", "true");
  cardIcon.textContent = "🍲";
  cardMedia.append(cardIcon);

  const cardTitle = document.createElement("span");
  cardTitle.className = "recipe-card__title recipe-title";
  cardTitle.textContent = recipe.title;

  card.append(cardMedia, cardTitle);

  const ingredientsWrapper = document.createElement("div");
  ingredientsWrapper.className = "recipe-ingredients";

  const ingredientsTitle = document.createElement("span");
  ingredientsTitle.className = "recipe-ingredients__title";
  ingredientsTitle.textContent = "Ingredientes";

  const ingredientsList = document.createElement("ul");
  ingredientsList.className = "recipe-ingredients__list";

  recipeIngredients.forEach((ingredient) => {
    const ingredientItem = buildRecipeIngredientItem(ingredient, {
      onRemove: () => {
        refreshRecipeIngredientsEmptyState(ingredientsList);
        persistRecipes();
      },
      onCategoryChange: () => {
        persistRecipes();
      },
      onToggleInclude: () => {
        persistRecipes();
      }
    });
    ingredientsList.append(ingredientItem);
  });
  refreshRecipeIngredientsEmptyState(ingredientsList);

  const ingredientControls = document.createElement("div");
  ingredientControls.className = "recipe-ingredient-controls";

  const ingredientInput = document.createElement("input");
  ingredientInput.type = "text";
  ingredientInput.className = "recipe-ingredient-controls__input";
  ingredientInput.placeholder = "Añadir ingrediente";

  const ingredientButton = document.createElement("button");
  ingredientButton.type = "button";
  ingredientButton.className = "btn ghost small";
  ingredientButton.textContent = "Agregar";

  const handleAddIngredient = () => {
    const value = ingredientInput.value.trim();
    if (!value) return;
    const ingredientItem = buildRecipeIngredientItem({ label: value }, {
      onRemove: () => {
        refreshRecipeIngredientsEmptyState(ingredientsList);
        persistRecipes();
      },
      onCategoryChange: () => {
        persistRecipes();
      },
      onToggleInclude: () => {
        persistRecipes();
      }
    });
    ingredientsList.append(ingredientItem);
    refreshRecipeIngredientsEmptyState(ingredientsList);
    ingredientInput.value = "";
    ingredientInput.focus();
    persistRecipes();
  };

  ingredientButton.addEventListener("click", handleAddIngredient);
  ingredientInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAddIngredient();
    }
  });

  ingredientControls.append(ingredientInput, ingredientButton);

  ingredientsWrapper.append(ingredientsTitle, ingredientsList, ingredientControls);

  const actions = document.createElement("div");
  actions.className = "recipe-actions";

  const dateField = document.createElement("label");
  dateField.className = "recipe-field";
  const dateLabel = document.createElement("span");
  dateLabel.textContent = "Fecha";
  const dateInput = document.createElement("input");
  dateInput.type = "date";
  dateInput.value = formatDateId(new Date());
  dateField.append(dateLabel, dateInput);

  const mealField = document.createElement("label");
  mealField.className = "recipe-field";
  const mealLabel = document.createElement("span");
  mealLabel.textContent = "Momento";
  const mealSelect = document.createElement("select");
  mealSelect.innerHTML = `
    <option value="lunch">Comida</option>
    <option value="dinner">Cena</option>
  `;
  mealField.append(mealLabel, mealSelect);

  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "btn secondary small";
  addButton.textContent = "Añadir al calendario";
  addButton.addEventListener("click", () => {
    planRecipeForDate({
      recipeTitle: recipe.title,
      dateValue: dateInput.value,
      meal: mealSelect.value
    });
    addRecipeIngredientsToShopping(getRecipeIngredientsFromList(ingredientsList));
    closeRecipeModal(item);
  });

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "btn ghost small";
  deleteButton.textContent = "Eliminar";
  deleteButton.addEventListener("click", () => {
    item.remove();
    updateRecipesEmptyState();
    applyRecipesFilter();
    persistRecipes();
    closeRecipeModal(item);
  });

  actions.append(dateField, mealField, addButton, deleteButton);

  const modal = document.createElement("div");
  modal.className = "recipe-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", `Receta ${recipe.title}`);

  const modalBackdrop = document.createElement("button");
  modalBackdrop.type = "button";
  modalBackdrop.className = "recipe-modal__backdrop";
  modalBackdrop.setAttribute("aria-label", "Cerrar receta");
  modalBackdrop.addEventListener("click", () => {
    closeRecipeModal(item);
  });

  const modalContent = document.createElement("div");
  modalContent.className = "recipe-modal__content";

  const modalHeader = document.createElement("div");
  modalHeader.className = "recipe-modal__header";

  const modalTitle = document.createElement("h3");
  modalTitle.textContent = recipe.title;

  const modalClose = document.createElement("button");
  modalClose.type = "button";
  modalClose.className = "recipe-modal__close";
  modalClose.textContent = "Cerrar";
  modalClose.addEventListener("click", () => {
    closeRecipeModal(item);
  });

  modalHeader.append(modalTitle, modalClose);

  const modalBody = document.createElement("div");
  modalBody.className = "recipe-modal__body";
  modalBody.append(ingredientsWrapper, actions);

  modalContent.append(modalHeader, modalBody);
  modal.append(modalBackdrop, modalContent);

  card.addEventListener("click", () => {
    openRecipeModal(item);
  });

  item.append(card, modal);
  recipesList.append(item);
  updateRecipesEmptyState();
  applyRecipesFilter();
  if (shouldPersist) {
    persistRecipes();
  }
}

function initShoppingList() {
  if (!shoppingForm || !shoppingInput || !shoppingList) return;
  shoppingForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = shoppingInput.value.trim();
    if (!value) return;
    const existingItem = findShoppingItemByLabel(value);
    if (existingItem) {
      shoppingInput.value = "";
      shoppingInput.focus();
      existingItem.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    addShoppingItem(value);
    shoppingInput.value = "";
    shoppingInput.focus();
  });
  if (clearCheckedBtn) {
    clearCheckedBtn.addEventListener("click", () => {
      const checkedItems = shoppingList.querySelectorAll(".shopping-item.is-checked");
      checkedItems.forEach((item) => {
        const list = item.closest(".shopping-category__list");
        item.remove();
        removeCategoryGroupIfEmpty(list);
        refreshCategoryCount(list);
      });
      updateShoppingEmptyState();
      persistShoppingList();
    });
  }
  if (collapseAllBtn) {
    collapseAllBtn.addEventListener("click", () => {
      const groups = shoppingList.querySelectorAll(".shopping-category");
      const hasExpanded = Array.from(groups).some((group) => !group.classList.contains("is-collapsed"));
      groups.forEach((group) => {
        const categoryId = group.dataset.category;
        const toggleButton = group.querySelector(".shopping-category__button:last-child");
        const shouldCollapse = hasExpanded;
        group.classList.toggle("is-collapsed", shouldCollapse);
        if (toggleButton) {
          toggleButton.textContent = shouldCollapse ? "Expandir" : "Colapsar";
          toggleButton.setAttribute("aria-expanded", String(!shouldCollapse));
        }
        persistCategoryCollapse(categoryId, shouldCollapse);
      });
      collapseAllBtn.textContent = hasExpanded ? "Expandir todo" : "Colapsar todo";
    });
  }
  const storedItems = loadShoppingItems();
  if (storedItems.length) {
    replaceShoppingItems(storedItems);
  }
  updateShoppingEmptyState();
  renderShoppingSuggestions();
}

function initRecipesList() {
  if (!recipesForm || !recipesInput || !recipesList) return;
  if (recipeIngredientAdd && recipeIngredientInput) {
    recipeIngredientAdd.addEventListener("click", () => {
      const value = recipeIngredientInput.value.trim();
      if (!value) return;
      addRecipeIngredientToDraft({ label: value });
      recipeIngredientInput.value = "";
      recipeIngredientInput.focus();
    });
  }
  if (recipesSearchInput) {
    recipesSearchInput.addEventListener("input", () => {
      applyRecipesFilter();
    });
  }
  recipesForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = recipesInput.value.trim();
    if (!value) return;
    const ingredients = getRecipeIngredientsFromList(recipeIngredientsList);
    addRecipeItem({ id: generateRecipeId(), title: value, ingredients });
    recipesInput.value = "";
    recipesInput.focus();
    clearRecipeIngredientsDraft();
  });
  const storedRecipes = loadRecipes();
  if (storedRecipes.length) {
    replaceRecipes(storedRecipes);
  }
  updateRecipesEmptyState();
  applyRecipesFilter();
}

function setActiveView(viewId) {
  viewPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.id === viewId);
  });
  viewButtons.forEach((button) => {
    const isActive = button.dataset.view === viewId;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function initViewSwitcher() {
  if (!viewButtons.length || !viewPanels.length) return;
  viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveView(button.dataset.view);
      closeMenu();
    });
  });
}

function openMenu() {
  if (menuBackdrop) {
    menuBackdrop.style.display = "block";
    menuBackdrop.setAttribute("aria-hidden", "false");
  }
  document.body.classList.add("is-menu-open");
}

function closeMenu() {
  document.body.classList.remove("is-menu-open");
  if (menuBackdrop) {
    menuBackdrop.setAttribute("aria-hidden", "true");
    window.setTimeout(() => {
      if (!document.body.classList.contains("is-menu-open")) {
        menuBackdrop.style.display = "none";
      }
    }, 220);
  }
  forceIOSRepaintAfterMenu();
}

function isIOSDevice() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function forceIOSRepaintAfterMenu() {
  if (!isIOSDevice()) return;
  requestAnimationFrame(() => {
    document.body.style.transform = "translateZ(0)";
    requestAnimationFrame(() => {
      document.body.style.transform = "";
    });
  });
}

function applyTheme(theme) {
  if (theme === "dark") {
    document.body.setAttribute("data-theme", "dark");
    if (themeToggle) {
      themeToggle.innerHTML = "<i class=\"fa-solid fa-sun\" aria-hidden=\"true\"></i>";
      themeToggle.setAttribute("aria-label", "Cambiar a modo claro");
      themeToggle.setAttribute("aria-pressed", "true");
    }
  } else {
    document.body.removeAttribute("data-theme");
    if (themeToggle) {
      themeToggle.innerHTML = "<i class=\"fa-solid fa-moon\" aria-hidden=\"true\"></i>";
      themeToggle.setAttribute("aria-label", "Cambiar a modo oscuro");
      themeToggle.setAttribute("aria-pressed", "false");
    }
  }
}

function initThemeToggle() {
  if (!themeToggle) return;
  const storedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const initialTheme = storedTheme ? storedTheme : prefersDark ? "dark" : "light";
  applyTheme(initialTheme);
  themeToggle.addEventListener("click", () => {
    const isDark = document.body.getAttribute("data-theme") === "dark";
    const nextTheme = isDark ? "light" : "dark";
    localStorage.setItem("theme", nextTheme);
    applyTheme(nextTheme);
  });
}

function updateDayState(dateId, lunchValue, dinnerValue) {
  const elements = state.dayElements.get(dateId);
  if (!elements) return;
  const lunchFilled = Boolean(lunchValue.trim());
  const dinnerFilled = Boolean(dinnerValue.trim());

  elements.lunchStatus.classList.toggle("is-filled", lunchFilled);
  elements.lunchStatus.classList.toggle("is-empty", !lunchFilled);
  elements.dinnerStatus.classList.toggle("is-filled", dinnerFilled);
  elements.dinnerStatus.classList.toggle("is-empty", !dinnerFilled);

  elements.card.classList.toggle("is-empty", !lunchFilled && !dinnerFilled);
  updateEmptyDaysCount();
}

function updateEmptyDaysCount() {
  if (!emptyDaysPill) return;
  const emptyCount = Array.from(state.dayElements.values()).filter(
    (elements) =>
      !elements.lunchInput.value.trim() && !elements.dinnerInput.value.trim()
  ).length;
  if (emptyCount === 0) {
    emptyDaysPill.textContent = "Todo completo";
    emptyDaysPill.classList.remove("is-warning");
  } else if (emptyCount === 1) {
    emptyDaysPill.textContent = "1 día vacío";
    emptyDaysPill.classList.add("is-warning");
  } else {
    emptyDaysPill.textContent = `${emptyCount} días vacíos`;
    emptyDaysPill.classList.add("is-warning");
  }
}

function notifyRemoteChange(dateId) {
  if (!remoteNotice) return;
  const [year, month, day] = dateId.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const label = `${formatDayName(date)} ${dateFormatter.format(date)}`;
  showCalendarNotice(`Tu pareja actualizó ${label}.`);
}

function showCalendarNotice(message) {
  if (!remoteNotice) return;
  remoteNotice.textContent = message;
  remoteNotice.classList.add("is-visible");
  if (state.remoteNoticeTimer) {
    clearTimeout(state.remoteNoticeTimer);
  }
  state.remoteNoticeTimer = setTimeout(() => {
    remoteNotice.classList.remove("is-visible");
  }, 3500);
}

function jumpToNextEmptyDay() {
  const emptyEntry = Array.from(state.dayElements.entries()).find(
    ([, elements]) =>
      !elements.lunchInput.value.trim() && !elements.dinnerInput.value.trim()
  );
  if (!emptyEntry) {
    showCalendarNotice("No quedan huecos en estas dos semanas.");
    return;
  }
  const [, elements] = emptyEntry;
  const card = elements.card;
  card.scrollIntoView({ behavior: "smooth", block: "center" });
  elements.lunchInput.focus();
  showCalendarNotice("Primer día vacío listo para editar.");
}

const COLLAPSED_CATEGORIES_KEY = "collapsedCategories";

function loadCollapsedCategories() {
  try {
    const stored = localStorage.getItem(COLLAPSED_CATEGORIES_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function persistCategoryCollapse(categoryId, collapsed) {
  const stored = loadCollapsedCategories();
  stored[categoryId] = collapsed;
  localStorage.setItem(COLLAPSED_CATEGORIES_KEY, JSON.stringify(stored));
}

function isCategoryCollapsed(categoryId) {
  const stored = loadCollapsedCategories();
  return Boolean(stored[categoryId]);
}

function refreshCategoryCount(listElement) {
  if (!listElement) return;
  const group = listElement.closest(".shopping-category");
  if (!group) return;
  const countLabel = group.querySelector(".shopping-category__count");
  if (!countLabel) return;
  const items = listElement.querySelectorAll(".shopping-item");
  const checked = listElement.querySelectorAll(".shopping-item.is-checked");
  countLabel.textContent = `${checked.length}/${items.length}`;
}

function updateShoppingEmptyState() {
  if (!shoppingEmpty) return;
  if (!shoppingList) return;
  const totalItems = shoppingList.querySelectorAll(".shopping-item").length;
  shoppingEmpty.classList.toggle("is-visible", totalItems === 0);
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (state.activeAppModal) {
    closeAppModal({ action: "cancel" });
    return;
  }
  if (state.activeRecipeModal) {
    closeRecipeModal(state.activeRecipeModal);
  }
});

prevWeekBtn.addEventListener("click", () => changeWeek(-1));
nextWeekBtn.addEventListener("click", () => changeWeek(1));
todayBtn.addEventListener("click", jumpToToday);
if (menuToggle) {
  menuToggle.addEventListener("click", openMenu);
}
if (menuClose) {
  menuClose.addEventListener("click", closeMenu);
}
if (menuBackdrop) {
  menuBackdrop.addEventListener("click", closeMenu);
}

window.addEventListener("online", handleConnectivity);
window.addEventListener("offline", handleConnectivity);

onAuthStateChanged(auth, (user) => {
  if (!user) {
    signInAnonymously(auth).catch(() => {
      syncStatus.textContent = "No se pudo iniciar sesión";
    });
    return;
  }
  state.userId = user.uid;
  initCalendar();
  initCustomCategoriesSync();
  initShoppingItemsSync();
  initShoppingSuggestionsSync();
  initRecipesSync();
});

updateStatus();
initShoppingList();
initRecipesList();
initViewSwitcher();
initThemeToggle();
