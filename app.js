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
const viewButtons = document.querySelectorAll(".switch-btn");
const viewPanels = document.querySelectorAll(".view-panel");
const statusBadge = document.querySelector(".status-badge");
const themeToggle = document.getElementById("themeToggle");

const SHARED_CALENDAR_ID = "calendario-compartido";
const SHOPPING_CATEGORIES = [
  { id: "carne", label: "Carne" },
  { id: "pescado", label: "Pescado" },
  { id: "fruta-verdura", label: "Fruta y verdura" },
  { id: "hidratos", label: "Hidratos" },
  { id: "lacteos", label: "Lácteos" },
  { id: "despensa", label: "Despensa" },
  { id: "otros", label: "Otros" }
];

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

const state = {
  calendarId: SHARED_CALENDAR_ID,
  currentMonday: getMonday(new Date()),
  userId: null,
  unsubscribes: new Map(),
  timers: new Map(),
  flashTimers: new Map(),
  dayElements: new Map(),
  pendingSaves: 0,
  inFlight: 0
};

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
  statusBadge.classList.remove("is-preparing", "is-saving", "is-saved", "is-offline");
  statusBadge.classList.add(statusClass);
}

function handleConnectivity() {
  updateStatus();
}

function resetListeners() {
  state.unsubscribes.forEach((unsubscribe) => unsubscribe());
  state.unsubscribes.clear();
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

    const lunchField = document.createElement("div");
    lunchField.className = "field";
    const lunchLabel = document.createElement("label");
    lunchLabel.textContent = "Comida";
    const lunchInput = document.createElement("input");
    lunchInput.type = "text";
    lunchInput.placeholder = "Ej: Ensalada";
    lunchField.append(lunchLabel, lunchInput);

    const dinnerField = document.createElement("div");
    dinnerField.className = "field";
    const dinnerLabel = document.createElement("label");
    dinnerLabel.textContent = "Cena";
    const dinnerInput = document.createElement("input");
    dinnerInput.type = "text";
    dinnerInput.placeholder = "Ej: Pasta";
    dinnerField.append(dinnerLabel, dinnerInput);

    card.append(header, lunchField, dinnerField);
    calendarGrid.append(card);

    state.dayElements.set(dateId, {
      lunchInput,
      dinnerInput,
      clearBtn
    });

    lunchInput.addEventListener("input", () => scheduleSave(dateId));
    dinnerInput.addEventListener("input", () => scheduleSave(dateId));
    clearBtn.addEventListener("click", () => {
      lunchInput.value = "";
      dinnerInput.value = "";
      scheduleSave(dateId, true);
    });
  }

  updateRangeLabels();
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

function getShoppingCategory(value) {
  const normalized = normalizeText(value);
  const includesAny = (keywords) => keywords.some((keyword) => normalized.includes(keyword));

  if (includesAny(["carne", "pollo", "ternera", "cerdo", "pavo", "chuleta", "hamburguesa", "jamon"])) {
    return "carne";
  }
  if (includesAny(["pescado", "atun", "salmon", "merluza", "gamba", "gambas", "marisco"])) {
    return "pescado";
  }
  if (includesAny(["manzana", "pera", "platano", "naranja", "fresa", "fruta", "verdura", "lechuga", "tomate", "zanahoria", "pepino", "brocoli", "cebolla"])) {
    return "fruta-verdura";
  }
  if (includesAny(["pasta", "arroz", "pan", "patata", "patatas", "cereal", "harina", "avena", "quinoa"])) {
    return "hidratos";
  }
  if (includesAny(["leche", "yogur", "yogurt", "queso", "mantequilla", "nata"])) {
    return "lacteos";
  }
  if (includesAny(["legumbre", "lenteja", "garbanzo", "judia", "conserva", "aceite", "especia", "sal", "azucar", "vinagre"])) {
    return "despensa";
  }
  return "otros";
}

function getCategoryMeta(categoryId) {
  return SHOPPING_CATEGORIES.find((category) => category.id === categoryId) || SHOPPING_CATEGORIES.at(-1);
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

  const accent = document.createElement("span");
  accent.className = "shopping-category__accent";
  accent.setAttribute("aria-hidden", "true");

  header.append(title, accent);

  const list = document.createElement("ul");
  list.className = "shopping-category__list";

  group.append(header, list);

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

function addShoppingItem(value) {
  const categoryId = getShoppingCategory(value);
  const categoryMeta = getCategoryMeta(categoryId);
  const groupList = ensureCategoryGroup(categoryId);

  const item = document.createElement("li");
  item.className = "shopping-item";
  item.dataset.category = categoryMeta.id;

  const label = document.createElement("span");
  label.className = "shopping-item__label";
  label.textContent = value;

  const tag = document.createElement("span");
  tag.className = "shopping-item__tag";
  tag.textContent = categoryMeta.label;

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
  });

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "shopping-action delete";
  deleteBtn.setAttribute("aria-label", "Eliminar de la lista");
  deleteBtn.textContent = "✕";
  deleteBtn.addEventListener("click", () => {
    item.remove();
    removeCategoryGroupIfEmpty(groupList);
  });

  actions.append(toggleBtn, deleteBtn);
  item.append(label, tag, actions);
  groupList.append(item);
}

function initShoppingList() {
  if (!shoppingForm || !shoppingInput || !shoppingList) return;
  shoppingForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = shoppingInput.value.trim();
    if (!value) return;
    addShoppingItem(value);
    shoppingInput.value = "";
    shoppingInput.focus();
  });
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
    });
  });
}

function applyTheme(theme) {
  if (theme === "dark") {
    document.body.setAttribute("data-theme", "dark");
    if (themeToggle) {
      themeToggle.textContent = "Modo claro";
      themeToggle.setAttribute("aria-pressed", "true");
    }
  } else {
    document.body.removeAttribute("data-theme");
    if (themeToggle) {
      themeToggle.textContent = "Modo oscuro";
      themeToggle.setAttribute("aria-pressed", "false");
    }
  }
}

function initThemeToggle() {
  if (!themeToggle) return;
  const storedTheme = localStorage.getItem("theme");
  applyTheme(storedTheme === "dark" ? "dark" : "light");
  themeToggle.addEventListener("click", () => {
    const isDark = document.body.getAttribute("data-theme") === "dark";
    const nextTheme = isDark ? "light" : "dark";
    localStorage.setItem("theme", nextTheme);
    applyTheme(nextTheme);
  });
}

prevWeekBtn.addEventListener("click", () => changeWeek(-1));
nextWeekBtn.addEventListener("click", () => changeWeek(1));
todayBtn.addEventListener("click", jumpToToday);

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
});

updateStatus();
initShoppingList();
initViewSwitcher();
initThemeToggle();
