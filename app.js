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

import { normalizeText } from "./utils/normalizeText.js";

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
const calendarViewButtons = document.querySelectorAll(".calendar-view-btn");
const syncStatus = document.getElementById("syncStatus");
const rangeTitle = document.getElementById("rangeTitle");
const rangeSubtitle = document.getElementById("rangeSubtitle");
const shoppingForm = document.getElementById("shoppingForm");
const shoppingInput = document.getElementById("shoppingInput");
const shoppingQuantity = document.getElementById("shoppingQuantity");
const shoppingList = document.getElementById("shoppingList");
const shoppingEmpty = document.getElementById("shoppingEmpty");
const shoppingSuggestions = document.getElementById("shoppingSuggestions");
const shoppingSuggestionsList = document.getElementById("shoppingSuggestionsList");
const shoppingSuggestionsEmpty = document.getElementById("shoppingSuggestionsEmpty");
const recipesForm = document.getElementById("recipesForm");
const recipesInput = document.getElementById("recipesInput");
const recipeCategoryInput = document.getElementById("recipeCategoryInput");
const recipeProteinInput = document.getElementById("recipeProteinInput");
const recipeCarbsInput = document.getElementById("recipeCarbsInput");
const recipeVeggiesInput = document.getElementById("recipeVeggiesInput");
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

const recipeCategoryEmojis = {
  carne: "🥩",
  pescado: "🐟",
  "fruta-verdura": "🥗",
  hidratos: "🍝",
  lacteos: "🧀",
  despensa: "🥫",
  bebidas: "🥤",
  desayuno: "🥐",
  higiene: "🧴",
  snacks: "🍿",
  congelados: "🧊",
  otros: "🍲"
};

const recipeCategoryImages = {
  carne: "icon/carne.png",
  pescado: "icon/pescado.png",
  "fruta-verdura": "icon/ensalada.png",
  despensa: "icon/despensa.png"
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
const ACTIVE_VIEW_STORAGE_KEY = "activeView";
const CALENDAR_VIEW_STORAGE_KEY = "calendarViewMode";
const SHOPPING_SUGGESTIONS_MIN_COUNT = 2;
const SHOPPING_SUGGESTIONS_RECENCY_WINDOW_DAYS = 14;
const SHOPPING_SUGGESTIONS_RECENCY_MULTIPLIER = 0.3;
const SHOPPING_SUGGESTIONS_FREQUENCY_MULTIPLIER = 0.7;
const VALID_APP_VIEWS = ["calendarView", "shoppingView", "recipesView"];
const DEFAULT_ACTIVE_VIEW = VALID_APP_VIEWS[0];
const CALENDAR_VIEW_CONFIG = {
  day: { days: 1, step: 1, name: "día" },
  week: { days: 7, step: 7, name: "semana" },
  twoWeeks: { days: 14, step: 7, name: "2 semanas" }
};
const VALID_CALENDAR_VIEWS = Object.keys(CALENDAR_VIEW_CONFIG);

const state = {
  calendarId: SHARED_CALENDAR_ID,
  currentMonday: getMonday(new Date()),
  currentDate: new Date(),
  calendarView: loadStoredCalendarView(),
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
  seenDays: new Set(),
  shoppingCategoryOrder: loadShoppingCategoryOrder()
};

const dragState = {
  sourceDateId: null,
  sourceMeal: null,
  dragging: false
};

function isValidCalendarView(view) {
  return VALID_CALENDAR_VIEWS.includes(view);
}

function loadStoredCalendarView() {
  try {
    const storedView = localStorage.getItem(CALENDAR_VIEW_STORAGE_KEY);
    return isValidCalendarView(storedView) ? storedView : "twoWeeks";
  } catch {
    return "twoWeeks";
  }
}

function persistCalendarView(view) {
  if (!isValidCalendarView(view)) return;
  try {
    localStorage.setItem(CALENDAR_VIEW_STORAGE_KEY, view);
  } catch {
    // Ignore localStorage errors and keep current mode in-memory.
  }
}

const EMPTY_MEAL_COMPONENTS = {
  protein: "",
  carbs: "",
  veggies: ""
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

function isValidViewId(viewId) {
  return VALID_APP_VIEWS.includes(viewId);
}

function loadStoredActiveView() {
  try {
    const storedView = localStorage.getItem(ACTIVE_VIEW_STORAGE_KEY);
    return isValidViewId(storedView) ? storedView : null;
  } catch {
    return null;
  }
}

function persistActiveView(viewId) {
  if (!isValidViewId(viewId)) return;
  try {
    localStorage.setItem(ACTIVE_VIEW_STORAGE_KEY, viewId);
  } catch {
    // Ignore localStorage errors and keep current view in-memory.
  }
}

function resolveActiveView(viewId) {
  if (isValidViewId(viewId)) return viewId;

  const domDefaultView =
    document.querySelector(".view-panel.is-active")?.id ||
    document.querySelector(".switch-btn.is-active")?.dataset.view;

  if (isValidViewId(domDefaultView)) return domDefaultView;
  return DEFAULT_ACTIVE_VIEW;
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

function normalizeMealComponents(components) {
  return {
    protein: components?.protein?.trim?.() ?? "",
    carbs: components?.carbs?.trim?.() ?? "",
    veggies: components?.veggies?.trim?.() ?? ""
  };
}

function getMealSummary(mealEntry) {
  const entry = normalizeMealEntry(mealEntry);
  if (entry.title) return entry.title;
  const componentValues = [entry.components.protein, entry.components.carbs, entry.components.veggies]
    .map((value) => value.trim())
    .filter(Boolean);
  if (componentValues.length) return componentValues.join(" + ");
  return "";
}

function normalizeMealEntry(mealEntry) {
  if (typeof mealEntry === "string") {
    return {
      title: mealEntry.trim(),
      components: { ...EMPTY_MEAL_COMPONENTS }
    };
  }
  const title = mealEntry?.title?.trim?.() ?? "";
  const components = normalizeMealComponents(mealEntry?.components);
  return {
    title,
    components,
    recipeId: mealEntry?.recipeId || ""
  };
}

function hasMealEntryContent(mealEntry) {
  const summary = getMealSummary(mealEntry);
  return Boolean(summary.trim());
}

function normalizeDayDoc(dayData = {}) {
  return {
    lunch: normalizeMealEntry(dayData.lunch),
    dinner: normalizeMealEntry(dayData.dinner)
  };
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

  const viewConfig = CALENDAR_VIEW_CONFIG[state.calendarView] || CALENDAR_VIEW_CONFIG.twoWeeks;
  const startDate = getCalendarStartDate();
  calendarGrid.style.setProperty("--calendar-columns", String(Math.min(viewConfig.days, 7)));

  for (let i = 0; i < viewConfig.days; i += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);

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

    const mealsContainer = document.createElement("div");
    mealsContainer.className = "meal-rows";

    const createMealRow = (mealId, label) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "meal-row";
      row.setAttribute("aria-label", `Editar ${label.toLowerCase()} de ${formatDayName(date)}`);

      const status = document.createElement("span");
      status.className = "day-chip";
      status.textContent = label;

      const content = document.createElement("div");
      content.className = "meal-row__content";

      const summary = document.createElement("div");
      summary.className = "meal-summary";
      summary.textContent = "Añadir plato";

      const chips = document.createElement("div");
      chips.className = "meal-components";
      [
        ["protein", "P"],
        ["carbs", "H"],
        ["veggies", "V"]
      ].forEach(([key, short]) => {
        const chip = document.createElement("span");
        chip.className = "meal-component-chip";
        chip.dataset.component = key;
        chip.innerHTML = `<strong>${short}</strong><span>+</span>`;
        chips.append(chip);
      });

      content.append(summary, chips);
      row.append(status, content);
      row.draggable = true;
      row.dataset.dateId = dateId;
      row.dataset.meal = mealId;
      row.addEventListener("dragstart", handleMealDragStart);
      row.addEventListener("dragover", handleMealDragOver);
      row.addEventListener("drop", handleMealDrop);
      row.addEventListener("dragend", handleMealDragEnd);
      row.addEventListener("click", () => {
        if (dragState.dragging) return;
        openMealEntryEditor({ dateId, meal: mealId, dateLabel: formatDayName(date) });
      });
      return { row, status, summary, chips };
    };

    const lunchElements = createMealRow("lunch", "Comida");
    const dinnerElements = createMealRow("dinner", "Cena");
    mealsContainer.append(lunchElements.row, dinnerElements.row);

    card.append(header, mealsContainer);
    calendarGrid.append(card);

    state.dayElements.set(dateId, {
      clearBtn,
      card,
      lunch: { ...lunchElements, entry: normalizeMealEntry(null) },
      dinner: { ...dinnerElements, entry: normalizeMealEntry(null) }
    });

    clearBtn.addEventListener("click", () => {
      updateInputs(dateId, {
        lunch: normalizeMealEntry(null),
        dinner: normalizeMealEntry(null)
      });
      scheduleSave(dateId, true);
    });

    updateInputs(dateId, { lunch: normalizeMealEntry(null), dinner: normalizeMealEntry(null) });
  }

  updateRangeLabels();
  updateEmptyDaysCount();
  if (state.userId) {
    attachListeners();
  }
}

function updateRangeLabels() {
  const viewConfig = CALENDAR_VIEW_CONFIG[state.calendarView] || CALENDAR_VIEW_CONFIG.twoWeeks;
  const startDate = getCalendarStartDate();
  calendarGrid.style.setProperty("--calendar-columns", String(Math.min(viewConfig.days, 7)));
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + viewConfig.days - 1);

  if (viewConfig.days === 1) {
    rangeTitle.textContent = rangeFormatter.format(startDate);
    rangeSubtitle.textContent = "Vista día";
  } else {
    rangeTitle.textContent = `Desde ${rangeFormatter.format(startDate)}`;
    rangeSubtitle.textContent = `Hasta ${rangeFormatter.format(endDate)}`;
  }

  prevWeekBtn.setAttribute("aria-label", `${viewConfig.name} anterior`);
  nextWeekBtn.setAttribute("aria-label", `${viewConfig.name} siguiente`);
}

function attachListeners() {
  resetListeners();
  state.dayElements.forEach((_elements, dateId) => {
    const docRef = doc(db, "calendars", state.calendarId, "days", dateId);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      const data = snapshot.data();
      if (!data) {
        updateInputs(dateId, normalizeDayDoc());
        return;
      }
      if (state.seenDays.has(dateId) && data.updatedBy && data.updatedBy !== state.userId) {
        notifyRemoteChange(dateId);
      }
      state.seenDays.add(dateId);
      updateInputs(dateId, normalizeDayDoc(data));
    });
    state.unsubscribes.set(dateId, unsubscribe);
  });
}

function updateMealRow(mealElements, mealEntry) {
  const summary = getMealSummary(mealEntry);
  mealElements.entry = normalizeMealEntry(mealEntry);
  mealElements.summary.textContent = summary || "Añadir plato";
  mealElements.summary.title = summary;

  const chips = mealElements.chips.querySelectorAll('.meal-component-chip');
  const componentMap = [
    ["protein", "P"],
    ["carbs", "H"],
    ["veggies", "V"]
  ];
  componentMap.forEach(([key, short], index) => {
    const chip = chips[index];
    if (!chip) return;
    const value = mealElements.entry.components[key];
    chip.classList.toggle("is-empty", !value);
    chip.classList.toggle("is-filled", Boolean(value));
    chip.replaceChildren();
    const shortLabel = document.createElement("strong");
    shortLabel.textContent = short;
    const content = document.createElement("span");
    content.textContent = value || "+";
    chip.append(shortLabel, content);
    chip.title = value || `Añadir ${short}`;
  });

  const hasValue = hasMealEntryContent(mealElements.entry);
  mealElements.status.classList.toggle("is-filled", hasValue);
  mealElements.status.classList.toggle("is-empty", !hasValue);
}

function updateInputs(dateId, dayData) {
  const elements = state.dayElements.get(dateId);
  if (!elements) return;
  const normalizedDayData = normalizeDayDoc(dayData);
  const shouldFlash =
    getMealSummary(elements.lunch.entry) !== getMealSummary(normalizedDayData.lunch) ||
    getMealSummary(elements.dinner.entry) !== getMealSummary(normalizedDayData.dinner);

  updateMealRow(elements.lunch, normalizedDayData.lunch);
  updateMealRow(elements.dinner, normalizedDayData.dinner);

  if (shouldFlash) {
    triggerFlash(elements.card, dateId);
  }

  updateDayState(dateId);
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
        lunch: normalizeMealEntry(elements.lunch.entry),
        dinner: normalizeMealEntry(elements.dinner.entry),
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
  const viewConfig = CALENDAR_VIEW_CONFIG[state.calendarView] || CALENDAR_VIEW_CONFIG.twoWeeks;
  const shiftDays = viewConfig.step * offset;
  state.currentDate = addDays(state.currentDate, shiftDays);
  state.currentMonday = getMonday(state.currentDate);
  buildCalendar();
}

function jumpToToday() {
  state.currentDate = new Date();
  state.currentMonday = getMonday(state.currentDate);
  buildCalendar();
}

function getCalendarStartDate() {
  if (state.calendarView === "day") {
    return startOfDay(state.currentDate);
  }
  return getMonday(state.currentDate);
}

function startOfDay(date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function setCalendarView(view) {
  if (!isValidCalendarView(view)) return;
  state.calendarView = view;
  persistCalendarView(view);
  calendarViewButtons.forEach((button) => {
    const isActive = button.dataset.calendarView === view;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  buildCalendar();
}

function initCalendar() {
  resetTimers();
  state.currentMonday = getMonday(state.currentDate);
  setCalendarView(state.calendarView);
  updateStatus();
}

const CUSTOM_CATEGORIES_KEY = "customCategories";
const CUSTOM_CATEGORIES_DOC_ID = "customCategories";
const SHOPPING_ITEMS_KEY = "shoppingItems";
const SHOPPING_ITEMS_DOC_ID = "items";
const SHOPPING_SUGGESTIONS_KEY = "shoppingSuggestions";
const SHOPPING_SUGGESTIONS_DOC_ID = "suggestions";
const RECIPES_KEY = "recipes";
const RECIPES_DOC_ID = "items";
const SHOPPING_SUGGESTIONS_LIMIT = 20;
const SHOPPING_ITEM_HIGHLIGHT_MS = 800;
const shoppingMotionMediaQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)") ?? null;

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

function getDefaultShoppingCategoryOrder() {
  return SHOPPING_CATEGORIES.map((category) => category.id);
}

function loadShoppingCategoryOrder() {
  const defaultOrder = getDefaultShoppingCategoryOrder();
  try {
    const stored = localStorage.getItem("shoppingCategoryOrder");
    const parsed = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(parsed)) return defaultOrder;
    const seen = new Set();
    const valid = parsed.filter((categoryId) => {
      if (!defaultOrder.includes(categoryId) || seen.has(categoryId)) return false;
      seen.add(categoryId);
      return true;
    });
    defaultOrder.forEach((categoryId) => {
      if (!seen.has(categoryId)) {
        valid.push(categoryId);
      }
    });
    return valid;
  } catch {
    return defaultOrder;
  }
}

function saveShoppingCategoryOrder(order) {
  localStorage.setItem("shoppingCategoryOrder", JSON.stringify(order));
}

function getShoppingCategoryOrderIndex(categoryId) {
  const index = state.shoppingCategoryOrder.indexOf(categoryId);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

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
    .map((ingredient) => {
      const quantityValue = Number.parseFloat(ingredient?.quantityValue);
      const quantityUnit = ingredient?.quantityUnit === "unit" ? "unit" : "g";
      const hasQuantity = Number.isFinite(quantityValue) && quantityValue > 0;
      return {
        label: ingredient?.label?.trim() ?? "",
        categoryId: ingredient?.categoryId || "",
        includeInShopping: ingredient?.includeInShopping !== false,
        quantityValue: hasQuantity ? quantityValue : "",
        quantityUnit
      };
    })
    .filter((ingredient) => ingredient.label);
}

function normalizeRecipeComponents(components) {
  return normalizeMealComponents(components);
}

function normalizeRecipeCategoryId(categoryId) {
  if (!categoryId) return "";
  const normalized = categoryId.trim();
  return SHOPPING_CATEGORIES.some((category) => category.id === normalized) ? normalized : "";
}

function serializeRecipesForCompare(recipes) {
  if (!Array.isArray(recipes)) return "[]";
  return JSON.stringify(
    recipes.map((recipe) => ({
      id: recipe?.id ?? "",
      title: recipe?.title?.trim() ?? "",
      categoryId: normalizeRecipeCategoryId(recipe?.categoryId),
      components: normalizeRecipeComponents(recipe?.components),
      ingredients: normalizeRecipeIngredients(recipe?.ingredients)
    }))
  );
}

function getRecipeIngredientCategoryId(label, categoryId) {
  return categoryId || getCustomCategory(label) || getShoppingCategory(label);
}

function buildRecipeIngredientItem(ingredient, options = {}) {
  const { onRemove, onCategoryChange, onToggleInclude, onQuantityChange } = options;
  const item = document.createElement("li");
  item.className = "recipe-ingredient";

  const label = document.createElement("span");
  label.className = "recipe-ingredient__label";
  label.textContent = ingredient.label;

  const quantityWrapper = document.createElement("div");
  quantityWrapper.className = "recipe-ingredient__quantity";

  const quantityInput = document.createElement("input");
  quantityInput.type = "number";
  quantityInput.min = "0";
  quantityInput.step = "1";
  quantityInput.inputMode = "numeric";
  quantityInput.className = "recipe-ingredient__quantity-input";
  quantityInput.placeholder = "Cantidad";
  quantityInput.setAttribute("aria-label", `Cantidad para ${ingredient.label}`);
  quantityInput.value = ingredient?.quantityValue ? String(ingredient.quantityValue) : "";

  const quantityUnit = document.createElement("select");
  quantityUnit.className = "recipe-ingredient__quantity-unit";
  quantityUnit.setAttribute("aria-label", `Unidad para ${ingredient.label}`);
  quantityUnit.innerHTML = `
    <option value="g">g</option>
    <option value="unit">ud</option>
  `;
  quantityUnit.value = ingredient?.quantityUnit === "unit" ? "unit" : "g";

  const updateQuantityState = () => {
    const parsedValue = Number.parseFloat(quantityInput.value);
    const hasQuantity = Number.isFinite(parsedValue) && parsedValue > 0;
    item.dataset.quantityValue = hasQuantity ? String(Math.round(parsedValue)) : "";
    item.dataset.quantityUnit = quantityUnit.value;
    if (onQuantityChange) {
      onQuantityChange({
        quantityValue: item.dataset.quantityValue,
        quantityUnit: item.dataset.quantityUnit
      });
    }
  };

  quantityInput.addEventListener("input", () => {
    updateQuantityState();
  });
  quantityUnit.addEventListener("change", () => {
    updateQuantityState();
  });

  quantityWrapper.append(quantityInput, quantityUnit);

  const categoryId = getRecipeIngredientCategoryId(ingredient.label, ingredient.categoryId);
  item.dataset.category = categoryId;
  item.dataset.quantityValue = "";
  item.dataset.quantityUnit = quantityUnit.value;
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

  updateQuantityState();

  item.append(label, quantityWrapper, categoryWrapper, toggleIncludeButton, removeButton);
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
    includeInShopping: item.dataset.includeInShopping !== "false",
    quantityValue: item.dataset.quantityValue || "",
    quantityUnit: item.dataset.quantityUnit === "unit" ? "unit" : "g"
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
    categoryId: item.dataset.recipeCategory || "",
    components: {
      protein: item.dataset.recipeProtein || "",
      carbs: item.dataset.recipeCarbs || "",
      veggies: item.dataset.recipeVeggies || ""
    },
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
  state.activeRecipeModal = null;
  document.body.classList.remove("has-recipe-modal");
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

function prefersReducedMotion() {
  return shoppingMotionMediaQuery?.matches === true;
}

function createShoppingItemId() {
  if (typeof crypto?.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getShoppingItemIdentity(item) {
  if (item?.id) {
    return `id:${item.id}`;
  }
  const normalized = normalizeText(item?.label ?? "");
  if (!normalized) return "";
  return `legacy:${item?.categoryId || "otros"}:${normalized}`;
}

function animateShoppingItem(item, { source = "local" } = {}) {
  if (!item) return;
  const isRemote = source === "remote";
  const highlightClass = isRemote ? "shopping-item--highlight-remote" : "shopping-item--highlight";
  item.classList.remove("shopping-item--enter", "shopping-item--highlight", "shopping-item--highlight-remote");

  const clearHighlight = () => {
    item.classList.remove("shopping-item--highlight", "shopping-item--highlight-remote", "shopping-item--no-motion");
  };

  if (prefersReducedMotion()) {
    item.classList.add(highlightClass, "shopping-item--no-motion");
    setTimeout(clearHighlight, SHOPPING_ITEM_HIGHLIGHT_MS);
    return;
  }

  if (!isRemote) {
    item.classList.add("shopping-item--enter");
    item.addEventListener("animationend", (event) => {
      if (event.animationName === "shopping-item-enter") {
        item.classList.remove("shopping-item--enter");
      }
    }, { once: true });
  }

  requestAnimationFrame(() => {
    item.classList.add(highlightClass);
  });
  setTimeout(clearHighlight, SHOPPING_ITEM_HIGHLIGHT_MS + (isRemote ? 0 : 50));
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
    id: item.dataset.itemId || "",
    createdAt: Number(item.dataset.createdAt) || Date.now(),
    label: item.querySelector(".shopping-item__name")?.textContent ?? "",
    quantity: Math.max(1, Number(item.dataset.quantity) || 1),
    categoryId: item.dataset.category || "otros",
    checked: item.classList.contains("is-checked")
  }));
}

function serializeShoppingItems(items) {
  return JSON.stringify(
    items.map((item) => ({
      id: item.id ?? "",
      label: item.label ?? "",
      quantity: Math.max(1, Number(item.quantity) || 1),
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

function getNormalizedShoppingLabelsInList() {
  if (!shoppingList) return new Set();
  return new Set(
    Array.from(shoppingList.querySelectorAll(".shopping-item__name"))
      .map((item) => normalizeText(item.textContent ?? ""))
      .filter(Boolean)
  );
}

function getSuggestionScore(suggestion) {
  const count = Math.max(0, Number(suggestion?.count) || 0);
  const lastAdded = Number(suggestion?.lastAdded) || 0;
  const ageMs = Math.max(0, Date.now() - lastAdded);
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const recencyDecay = Math.exp(-ageDays / SHOPPING_SUGGESTIONS_RECENCY_WINDOW_DAYS);
  return count * SHOPPING_SUGGESTIONS_FREQUENCY_MULTIPLIER + recencyDecay * SHOPPING_SUGGESTIONS_RECENCY_MULTIPLIER;
}

function getShoppingSuggestions() {
  const itemsInList = getNormalizedShoppingLabelsInList();
  return Array.from(state.shoppingSuggestions.values())
    .filter((suggestion) => {
      const normalizedLabel = normalizeText(suggestion?.label ?? "");
      if (!normalizedLabel || itemsInList.has(normalizedLabel)) return false;
      return (Number(suggestion?.count) || 0) >= SHOPPING_SUGGESTIONS_MIN_COUNT;
    })
    .sort((a, b) => {
      const scoreDiff = getSuggestionScore(b) - getSuggestionScore(a);
      if (scoreDiff !== 0) return scoreDiff;
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

function recordShoppingSuggestion(label, options = {}) {
  const { increment = 1, updateLastAdded = true } = options;
  const trimmedLabel = label.trim();
  if (!trimmedLabel) return;
  const normalized = normalizeText(trimmedLabel);
  if (!normalized) return;
  const safeIncrement = Number(increment);
  if (!Number.isFinite(safeIncrement) || safeIncrement <= 0) return;
  const current = state.shoppingSuggestions.get(normalized) || {
    label: trimmedLabel,
    count: 0,
    lastAdded: 0
  };
  state.shoppingSuggestions.set(normalized, {
    label: trimmedLabel,
    count: current.count + safeIncrement,
    lastAdded: updateLastAdded ? Date.now() : current.lastAdded
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
  const {
    updateTimestamp = false,
    remoteUpdatedAt = 0,
    shouldAnimateNew = false,
    animationSource = "local",
    knownItems = new Set()
  } = options;
  shoppingList.innerHTML = "";
  items.forEach((item) => {
    if (item?.label) {
      const identity = getShoppingItemIdentity(item);
      addShoppingItem(item.label, {
        itemId: item.id,
        createdAt: item.createdAt,
        quantity: item.quantity,
        categoryId: item.categoryId,
        checked: item.checked,
        shouldPersist: false,
        shouldTrackSuggestions: false,
        shouldAnimate: shouldAnimateNew && identity ? !knownItems.has(identity) : false,
        animationSource
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
    const knownItems = new Set(
      getShoppingItemsFromDom().map((item) => getShoppingItemIdentity(item)).filter(Boolean)
    );
    replaceShoppingItems(data.items, {
      updateTimestamp: true,
      remoteUpdatedAt,
      shouldAnimateNew: true,
      animationSource: "remote",
      knownItems
    });
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

function getRecipeVisualCategory(ingredients = []) {
  const counts = new Map();
  ingredients.forEach((ingredient) => {
    const categoryId = getRecipeIngredientCategoryId(ingredient?.label, ingredient?.categoryId);
    const previousCount = counts.get(categoryId) || 0;
    counts.set(categoryId, previousCount + 1);
  });

  const prioritized = Array.from(counts.entries())
    .filter(([categoryId]) => categoryId && categoryId !== "otros")
    .sort((left, right) => right[1] - left[1]);

  return prioritized[0]?.[0] || "otros";
}

function getResolvedRecipeCategoryId({ categoryId = "", ingredients = [] } = {}) {
  const normalizedCategoryId = normalizeRecipeCategoryId(categoryId);
  if (normalizedCategoryId) return normalizedCategoryId;
  return getRecipeVisualCategory(ingredients);
}

function setRecipeCardIconElement(iconElement, categoryId) {
  const imagePath = recipeCategoryImages[categoryId];
  if (imagePath) {
    iconElement.textContent = "";
    const image = document.createElement("img");
    image.className = "recipe-card__icon-image";
    image.src = imagePath;
    image.alt = "";
    iconElement.append(image);
    return;
  }

  iconElement.textContent = recipeCategoryEmojis[categoryId] || recipeCategoryEmojis.otros;
}

function buildRecipeCategorySelect({ selectedCategoryId = "" } = {}) {
  const select = document.createElement("select");
  select.className = "recipe-category-select";

  const automaticOption = document.createElement("option");
  automaticOption.value = "";
  automaticOption.textContent = "Automática";
  automaticOption.selected = !selectedCategoryId;
  select.append(automaticOption);

  SHOPPING_CATEGORIES.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.label;
    if (category.id === selectedCategoryId) {
      option.selected = true;
    }
    select.append(option);
  });

  return select;
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

  const moveUpButton = document.createElement("button");
  moveUpButton.type = "button";
  moveUpButton.className = "shopping-category__button shopping-category__button--icon";
  moveUpButton.dataset.action = "move-up";
  moveUpButton.setAttribute("aria-label", `Subir categoría ${categoryMeta.label}`);
  moveUpButton.innerHTML = '<i class="fa-solid fa-arrow-up" aria-hidden="true"></i>';
  moveUpButton.addEventListener("click", () => {
    moveShoppingCategory(categoryMeta.id, -1);
  });

  const moveDownButton = document.createElement("button");
  moveDownButton.type = "button";
  moveDownButton.className = "shopping-category__button shopping-category__button--icon";
  moveDownButton.dataset.action = "move-down";
  moveDownButton.setAttribute("aria-label", `Bajar categoría ${categoryMeta.label}`);
  moveDownButton.innerHTML = '<i class="fa-solid fa-arrow-down" aria-hidden="true"></i>';
  moveDownButton.addEventListener("click", () => {
    moveShoppingCategory(categoryMeta.id, 1);
  });

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

  headerActions.append(moveUpButton, moveDownButton, clearCheckedButton, toggleButton);

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

  const categoryIndex = getShoppingCategoryOrderIndex(categoryMeta.id);
  const groups = Array.from(shoppingList.querySelectorAll(".shopping-category"));
  const insertBefore = groups.find((element) => {
    const elementIndex = getShoppingCategoryOrderIndex(element.dataset.category);
    return elementIndex > categoryIndex;
  });

  if (insertBefore) {
    shoppingList.insertBefore(group, insertBefore);
  } else {
    shoppingList.append(group);
  }

  refreshShoppingCategoryOrderControls();

  return list;
}

function refreshShoppingCategoryOrderControls() {
  if (!shoppingList) return;
  const groups = Array.from(shoppingList.querySelectorAll(".shopping-category"));
  const visibleCategoryIds = groups.map((group) => group.dataset.category);
  groups.forEach((group) => {
    const categoryId = group.dataset.category;
    const position = visibleCategoryIds.indexOf(categoryId);
    const moveUpButton = group.querySelector('[data-action="move-up"]');
    const moveDownButton = group.querySelector('[data-action="move-down"]');
    if (moveUpButton) {
      moveUpButton.disabled = position <= 0;
    }
    if (moveDownButton) {
      moveDownButton.disabled = position === -1 || position >= visibleCategoryIds.length - 1;
    }
  });
}

function moveShoppingCategory(categoryId, direction) {
  const groups = Array.from(shoppingList.querySelectorAll(".shopping-category"));
  const visibleCategoryIds = groups.map((group) => group.dataset.category);
  const fromVisibleIndex = visibleCategoryIds.indexOf(categoryId);
  if (fromVisibleIndex === -1) return;

  const toVisibleIndex = fromVisibleIndex + direction;
  if (toVisibleIndex < 0 || toVisibleIndex >= visibleCategoryIds.length) return;

  const targetCategoryId = visibleCategoryIds[toVisibleIndex];
  if (!targetCategoryId || targetCategoryId === categoryId) return;

  const nextOrder = [...state.shoppingCategoryOrder];
  const fromIndex = nextOrder.indexOf(categoryId);
  if (fromIndex === -1) return;
  const [moved] = nextOrder.splice(fromIndex, 1);

  const targetIndex = nextOrder.indexOf(targetCategoryId);
  if (targetIndex === -1) return;
  const insertIndex = direction < 0 ? targetIndex : targetIndex + 1;
  nextOrder.splice(insertIndex, 0, moved);

  state.shoppingCategoryOrder = nextOrder;
  saveShoppingCategoryOrder(state.shoppingCategoryOrder);
  groups
    .sort(
      (left, right) =>
        getShoppingCategoryOrderIndex(left.dataset.category) -
        getShoppingCategoryOrderIndex(right.dataset.category)
    )
    .forEach((group) => {
      shoppingList.append(group);
    });

  refreshShoppingCategoryOrderControls();
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
    itemId = createShoppingItemId(),
    createdAt = Date.now(),
    quantity = 1,
    categoryId = getShoppingCategory(value),
    checked = false,
    shouldPersist = true,
    shouldTrackSuggestions = true,
    shouldAnimate = true,
    animationSource = "local"
  } = options;
  const safeQuantity = Math.max(1, Number(quantity) || 1);
  const categoryMeta = getCategoryMeta(categoryId);
  const groupList = ensureCategoryGroup(categoryId);

  const item = document.createElement("li");
  item.className = "shopping-item";
  item.dataset.itemId = itemId;
  item.dataset.createdAt = String(createdAt);
  item.dataset.category = categoryMeta.id;
  item.dataset.quantity = String(safeQuantity);

  const label = document.createElement("span");
  label.className = "shopping-item__label";

  const icon = document.createElement("i");
  icon.className = `fa-solid ${getCategoryIconClass(categoryMeta.id)} shopping-item__icon`;
  icon.setAttribute("aria-hidden", "true");

  const name = document.createElement("span");
  name.className = "shopping-item__name";
  name.textContent = value;

  label.append(icon, name);

  if (safeQuantity > 1) {
    const quantityBadge = document.createElement("span");
    quantityBadge.className = "shopping-item__quantity";
    quantityBadge.textContent = `x${safeQuantity}`;
    quantityBadge.setAttribute("aria-label", `Cantidad ${safeQuantity}`);
    label.append(quantityBadge);
  }

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
    if (isChecked) {
      recordShoppingSuggestion(value, { increment: 1, updateLastAdded: true });
    }
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
  if (shouldAnimate) {
    animateShoppingItem(item, { source: animationSource });
  }
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
  const normalizedValue = normalizeText(value);
  if (!normalizedValue) return null;
  return Array.from(shoppingList.querySelectorAll(".shopping-item")).find((item) => {
    const label = item.querySelector(".shopping-item__name")?.textContent ?? "";
    return normalizeText(label) === normalizedValue;
  });
}

function updateRecipesEmptyState() {
  if (!recipesEmpty || !recipesList) return;
  const totalItems = recipesList.querySelectorAll(".recipe-item").length;
  recipesEmpty.classList.toggle("is-visible", totalItems === 0);
}

function updateRecipesSearchEmptyState() {
  if (!recipesSearchEmpty || !recipesList) return;
  const query = state.recipesFilter || "";
  const totalItems = recipesList.querySelectorAll(".recipe-item").length;
  const visibleItems = recipesList.querySelectorAll(".recipe-item:not(.is-hidden)").length;
  const shouldShow = Boolean(query) && totalItems > 0 && visibleItems === 0;
  recipesSearchEmpty.classList.toggle("is-visible", shouldShow);
}

function applyRecipesFilter(rawQuery = recipesSearchInput?.value ?? "") {
  if (!recipesList) return;
  const query = normalizeText(rawQuery);
  state.recipesFilter = query;
  recipesList.querySelectorAll(".recipe-item").forEach((item) => {
    const title = item.dataset.recipeTitle || "";
    const matches = !query || title.includes(query);
    item.classList.toggle("is-hidden", !matches);
  });
  updateRecipesSearchEmptyState();
}

function isDateInCurrentRange(date) {
  const start = getCalendarStartDate();
  const viewConfig = CALENDAR_VIEW_CONFIG[state.calendarView] || CALENDAR_VIEW_CONFIG.twoWeeks;
  const end = new Date(start);
  end.setDate(end.getDate() + viewConfig.days - 1);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return date >= start && date <= end;
}

function getRecentComponentValues(componentKey) {
  const values = new Set();
  state.dayElements.forEach((day) => {
    [day.lunch.entry, day.dinner.entry].forEach((entry) => {
      const value = normalizeMealEntry(entry).components[componentKey];
      if (value) values.add(value);
    });
  });
  loadRecipes().forEach((recipe) => {
    const value = normalizeRecipeComponents(recipe.components)[componentKey];
    if (value) values.add(value);
  });
  return Array.from(values).slice(0, 12);
}

function buildAutocompleteList(id, values) {
  const datalist = document.createElement("datalist");
  datalist.id = id;
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    datalist.append(option);
  });
  return datalist;
}

function openMealEntryEditor({ dateId, meal, dateLabel }) {
  const day = state.dayElements.get(dateId);
  if (!day) return;
  const mealKey = meal === "dinner" ? "dinner" : "lunch";
  const currentEntry = normalizeMealEntry(day[mealKey].entry);

  const overlay = document.createElement("div");
  overlay.className = "app-modal-overlay";
  overlay.setAttribute("role", "presentation");

  const modal = document.createElement("form");
  modal.className = "app-modal meal-editor-modal";
  modal.setAttribute("aria-label", `Editar ${mealKey === "lunch" ? "comida" : "cena"}`);

  const title = document.createElement("h3");
  title.className = "app-modal__title";
  title.textContent = `${mealKey === "lunch" ? "Comida" : "Cena"} · ${dateLabel}`;

  const fields = [
    ["protein", "Proteína (P)", "Ej: pollo plancha"],
    ["carbs", "Hidratos (H)", "Ej: arroz"],
    ["veggies", "Verduras (V)", "Ej: calabacín"]
  ];
  const inputs = {};

  fields.forEach(([key, label, placeholder]) => {
    const wrapper = document.createElement("label");
    wrapper.className = "field";
    const span = document.createElement("span");
    span.textContent = label;
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = placeholder;
    input.value = currentEntry.components[key] || "";
    const listId = `meal-recent-${key}-${Date.now()}`;
    input.setAttribute("list", listId);
    wrapper.append(span, input, buildAutocompleteList(listId, getRecentComponentValues(key)));
    modal.append(wrapper);
    inputs[key] = input;
  });

  const notesField = document.createElement("label");
  notesField.className = "field";
  notesField.innerHTML = "<span>Título / nota (opcional)</span>";
  const notesInput = document.createElement("input");
  notesInput.type = "text";
  notesInput.value = currentEntry.title || "";
  notesInput.placeholder = "Opcional";
  notesField.append(notesInput);

  const actions = document.createElement("div");
  actions.className = "app-modal__actions";
  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.className = "btn ghost";
  cancelButton.textContent = "Cancelar";
  const saveButton = document.createElement("button");
  saveButton.type = "submit";
  saveButton.className = "btn secondary";
  saveButton.textContent = "Guardar";
  actions.append(cancelButton, saveButton);

  modal.prepend(title);
  modal.append(notesField, actions);
  overlay.append(modal);
  document.body.append(overlay);
  document.body.classList.add("has-app-modal");

  const close = () => {
    overlay.remove();
    document.body.classList.remove("has-app-modal");
  };

  cancelButton.addEventListener("click", close);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });

  modal.addEventListener("submit", (event) => {
    event.preventDefault();
    day[mealKey].entry = normalizeMealEntry({
      title: notesInput.value,
      components: {
        protein: inputs.protein.value,
        carbs: inputs.carbs.value,
        veggies: inputs.veggies.value
      },
      recipeId: currentEntry.recipeId || ""
    });
    updateInputs(dateId, { lunch: day.lunch.entry, dinner: day.dinner.entry });
    scheduleSave(dateId, true);
    close();
  });

  inputs.protein.focus();
}

function planRecipeForDate({ recipeTitle, recipeComponents, recipeId = "", dateValue, meal }) {
  const safeDateValue = dateValue || formatDateId(new Date());
  const date = new Date(`${safeDateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return;

  if (!isDateInCurrentRange(date)) {
    state.currentDate = date;
    state.currentMonday = getMonday(date);
    buildCalendar();
  }

  const dateId = formatDateId(date);
  const elements = state.dayElements.get(dateId);
  if (!elements) return;

  const mealKey = meal === "dinner" ? "dinner" : "lunch";
  const nextEntry = normalizeMealEntry({
    title: recipeTitle,
    components: normalizeMealComponents(recipeComponents),
    recipeId
  });

  if (!hasMealEntryContent(nextEntry)) {
    nextEntry.title = recipeTitle.trim();
  }

  elements[mealKey].entry = nextEntry;
  updateDayState(dateId);
  updateInputs(dateId, { lunch: elements.lunch.entry, dinner: elements.dinner.entry });
  scheduleSave(dateId, true);
  elements.card.scrollIntoView({ behavior: "smooth", block: "center" });
  showCalendarNotice(`Receta añadida a ${formatDayName(date)}.`);
}

async function addRecipeIngredientsToShopping(ingredients) {
  if (!Array.isArray(ingredients) || !ingredients.length) return;
  const existingLabels = new Set(
    Array.from(shoppingList?.querySelectorAll(".shopping-item__name") ?? [])
      .map((item) => normalizeText(item.textContent ?? ""))
      .filter(Boolean)
  );
  const normalizedIngredients = ingredients
    .map((ingredient) => {
      const label = ingredient?.label?.trim();
      if (!label || ingredient.includeInShopping === false) return null;
      return {
        label,
        normalizedLabel: normalizeText(label),
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
      shouldPersist: false,
      shouldTrackSuggestions: false
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
  const recipeCategoryId = normalizeRecipeCategoryId(recipe.categoryId);
  const recipeComponents = normalizeRecipeComponents(recipe.components);
  const visualRecipeCategoryId = getResolvedRecipeCategoryId({
    categoryId: recipeCategoryId,
    ingredients: recipeIngredients
  });
  const item = document.createElement("li");
  item.className = "recipe-item";
  item.dataset.recipeId = recipe.id;
  item.dataset.recipeTitle = normalizeText(recipe.title);
  item.dataset.recipeCategory = recipeCategoryId;
  item.dataset.recipeProtein = recipeComponents.protein;
  item.dataset.recipeCarbs = recipeComponents.carbs;
  item.dataset.recipeVeggies = recipeComponents.veggies;
  item.dataset.category = visualRecipeCategoryId;

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
  setRecipeCardIconElement(cardIcon, visualRecipeCategoryId);
  cardMedia.append(cardIcon);

  const applyRecipeCategoryPresentation = () => {
    const ingredients = getRecipeIngredientsFromList(ingredientsList);
    const resolvedCategoryId = getResolvedRecipeCategoryId({
      categoryId: item.dataset.recipeCategory || "",
      ingredients
    });
    item.dataset.category = resolvedCategoryId;
    setRecipeCardIconElement(cardIcon, resolvedCategoryId);
  };

  const cardTitle = document.createElement("span");
  cardTitle.className = "recipe-card__title recipe-title";
  cardTitle.textContent = recipe.title;

  const cardComponents = document.createElement("span");
  cardComponents.className = "recipe-card__components";
  cardComponents.textContent = getMealSummary({ title: "", components: recipeComponents }) || "Sin P/H/V";

  card.append(cardMedia, cardTitle, cardComponents);

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
        applyRecipeCategoryPresentation();
        persistRecipes();
      },
      onCategoryChange: () => {
        applyRecipeCategoryPresentation();
        persistRecipes();
      },
      onToggleInclude: () => {
        persistRecipes();
      },
      onQuantityChange: () => {
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
        applyRecipeCategoryPresentation();
        persistRecipes();
      },
      onCategoryChange: () => {
        applyRecipeCategoryPresentation();
        persistRecipes();
      },
      onToggleInclude: () => {
        persistRecipes();
      },
      onQuantityChange: () => {
        persistRecipes();
      }
    });
    ingredientsList.append(ingredientItem);
    refreshRecipeIngredientsEmptyState(ingredientsList);
    applyRecipeCategoryPresentation();
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

  const categoryField = document.createElement("label");
  categoryField.className = "recipe-field";
  const categoryLabel = document.createElement("span");
  categoryLabel.textContent = "Categoría";
  const categorySelect = buildRecipeCategorySelect({ selectedCategoryId: recipeCategoryId });
  categorySelect.addEventListener("change", () => {
    item.dataset.recipeCategory = normalizeRecipeCategoryId(categorySelect.value);
    applyRecipeCategoryPresentation();
    persistRecipes();
  });
  categoryField.append(categoryLabel, categorySelect);

  const componentsFieldset = document.createElement("div");
  componentsFieldset.className = "recipe-components-editor";

  const buildComponentField = (labelText, key, placeholder) => {
    const field = document.createElement("label");
    field.className = "recipe-field";
    const label = document.createElement("span");
    label.textContent = labelText;
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = placeholder;
    input.value = recipeComponents[key];
    input.addEventListener("input", () => {
      item.dataset[`recipe${key.charAt(0).toUpperCase()}${key.slice(1)}`] = input.value.trim();
      const nextSummary = getMealSummary({
        title: "",
        components: {
          protein: item.dataset.recipeProtein || "",
          carbs: item.dataset.recipeCarbs || "",
          veggies: item.dataset.recipeVeggies || ""
        }
      });
      cardComponents.textContent = nextSummary || "Sin P/H/V";
      persistRecipes();
    });
    field.append(label, input);
    return field;
  };

  componentsFieldset.append(
    buildComponentField("Proteína (P)", "protein", "Ej: pollo plancha"),
    buildComponentField("Hidratos (H)", "carbs", "Ej: arroz"),
    buildComponentField("Verduras (V)", "veggies", "Ej: calabacín")
  );

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
      recipeComponents: {
        protein: item.dataset.recipeProtein || "",
        carbs: item.dataset.recipeCarbs || "",
        veggies: item.dataset.recipeVeggies || ""
      },
      recipeId: item.dataset.recipeId,
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

  actions.append(categoryField, componentsFieldset, dateField, mealField, addButton, deleteButton);

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
  applyRecipeCategoryPresentation();
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
    const quantity = Math.max(1, Number(shoppingQuantity?.value) || 1);
    const existingItem = findShoppingItemByLabel(value);
    if (existingItem) {
      shoppingInput.value = "";
      if (shoppingQuantity) shoppingQuantity.value = "1";
      shoppingInput.focus();
      existingItem.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    addShoppingItem(value, { quantity });
    shoppingInput.value = "";
    if (shoppingQuantity) shoppingQuantity.value = "1";
    shoppingForm.classList.remove("is-submitted");
    void shoppingForm.offsetWidth;
    shoppingForm.classList.add("is-submitted");
    setTimeout(() => shoppingForm.classList.remove("is-submitted"), 260);
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
    replaceShoppingItems(storedItems, { shouldAnimateNew: false });
  }
  updateShoppingEmptyState();
  renderShoppingSuggestions();
}

function initRecipesList() {
  if (!recipesForm || !recipesInput || !recipesList) return;
  if (recipeCategoryInput) {
    const formCategorySelect = buildRecipeCategorySelect();
    formCategorySelect.id = "recipeCategoryInput";
    formCategorySelect.name = "recipeCategoryInput";
    recipeCategoryInput.replaceWith(formCategorySelect);
  }
  const currentRecipeCategoryInput = document.getElementById("recipeCategoryInput");
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
    const categoryId = normalizeRecipeCategoryId(currentRecipeCategoryInput?.value || "");
    const components = normalizeRecipeComponents({
      protein: recipeProteinInput?.value || "",
      carbs: recipeCarbsInput?.value || "",
      veggies: recipeVeggiesInput?.value || ""
    });
    addRecipeItem({ id: generateRecipeId(), title: value, categoryId, components, ingredients });
    recipesInput.value = "";
    if (currentRecipeCategoryInput) {
      currentRecipeCategoryInput.value = "";
    }
    if (recipeProteinInput) recipeProteinInput.value = "";
    if (recipeCarbsInput) recipeCarbsInput.value = "";
    if (recipeVeggiesInput) recipeVeggiesInput.value = "";
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
  const nextViewId = resolveActiveView(viewId);
  viewPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.id === nextViewId);
  });
  viewButtons.forEach((button) => {
    const isActive = button.dataset.view === nextViewId;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  persistActiveView(nextViewId);
}

function initViewSwitcher() {
  if (!viewButtons.length || !viewPanels.length) return;
  setActiveView(loadStoredActiveView());
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


function handleMealDragStart(event) {
  const row = event.currentTarget;
  dragState.sourceDateId = row.dataset.dateId || null;
  dragState.sourceMeal = row.dataset.meal || null;
  dragState.dragging = true;
  row.classList.add("is-dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", `${dragState.sourceDateId}:${dragState.sourceMeal}`);
}

function handleMealDragOver(event) {
  if (!dragState.dragging) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  event.currentTarget.classList.add("is-drag-over");
}

function handleMealDrop(event) {
  event.preventDefault();
  const targetRow = event.currentTarget;
  targetRow.classList.remove("is-drag-over");

  const targetDateId = targetRow.dataset.dateId;
  const targetMeal = targetRow.dataset.meal;
  const { sourceDateId, sourceMeal } = dragState;

  if (!sourceDateId || !sourceMeal || !targetDateId || !targetMeal) return;
  if (sourceDateId === targetDateId && sourceMeal === targetMeal) return;

  const sourceDay = state.dayElements.get(sourceDateId);
  const targetDay = state.dayElements.get(targetDateId);
  if (!sourceDay || !targetDay) return;

  const sourceEntry = normalizeMealEntry(sourceDay[sourceMeal].entry);
  const targetEntry = normalizeMealEntry(targetDay[targetMeal].entry);

  sourceDay[sourceMeal].entry = targetEntry;
  targetDay[targetMeal].entry = sourceEntry;

  updateInputs(sourceDateId, { lunch: sourceDay.lunch.entry, dinner: sourceDay.dinner.entry });
  updateInputs(targetDateId, { lunch: targetDay.lunch.entry, dinner: targetDay.dinner.entry });

  scheduleSave(sourceDateId, true);
  scheduleSave(targetDateId, true);
}

function handleMealDragEnd(event) {
  setTimeout(() => {
    dragState.dragging = false;
    dragState.sourceDateId = null;
    dragState.sourceMeal = null;
  }, 0);

  const row = event.currentTarget;
  row.classList.remove("is-dragging", "is-drag-over");
  document.querySelectorAll(".meal-row.is-drag-over").forEach((element) => {
    element.classList.remove("is-drag-over");
  });
}

function updateDayState(dateId) {
  const elements = state.dayElements.get(dateId);
  if (!elements) return;
  const lunchFilled = hasMealEntryContent(elements.lunch.entry);
  const dinnerFilled = hasMealEntryContent(elements.dinner.entry);
  elements.card.classList.toggle("is-empty", !lunchFilled && !dinnerFilled);
  updateEmptyDaysCount();
}

function updateEmptyDaysCount() {
  if (!emptyDaysPill) return;
  const emptyCount = Array.from(state.dayElements.values()).filter(
    (elements) => !hasMealEntryContent(elements.lunch.entry) && !hasMealEntryContent(elements.dinner.entry)
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
      !hasMealEntryContent(elements.lunch.entry) && !hasMealEntryContent(elements.dinner.entry)
  );
  if (!emptyEntry) {
    showCalendarNotice("No quedan huecos en la vista actual.");
    return;
  }
  const [dateId, elements] = emptyEntry;
  elements.card.scrollIntoView({ behavior: "smooth", block: "center" });
  openMealEntryEditor({ dateId, meal: "lunch", dateLabel: elements.card.querySelector('h3')?.textContent || "" });
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
calendarViewButtons.forEach((button) => {
  button.addEventListener("click", () => setCalendarView(button.dataset.calendarView));
});
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
