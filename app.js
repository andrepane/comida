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

const SHARED_CALENDAR_ID = "calendario-compartido";

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
  if (!navigator.onLine) {
    syncStatus.textContent = "Sin conexión";
    return;
  }
  if (state.pendingSaves > 0 || state.inFlight > 0) {
    syncStatus.textContent = "Guardando…";
  } else {
    syncStatus.textContent = "Guardado";
  }
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

  if (document.activeElement !== elements.lunchInput) {
    elements.lunchInput.value = lunchValue;
  }
  if (document.activeElement !== elements.dinnerInput) {
    elements.dinnerInput.value = dinnerValue;
  }
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
