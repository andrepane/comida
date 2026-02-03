const calendarGrid = document.getElementById("calendarGrid");
const monthLabel = document.getElementById("monthLabel");
const monthRange = document.getElementById("monthRange");
const prevMonthBtn = document.getElementById("prevMonth");
const nextMonthBtn = document.getElementById("nextMonth");
const todayBtn = document.getElementById("todayBtn");
const noteInput = document.getElementById("noteInput");
const saveNoteBtn = document.getElementById("saveNote");
const deleteNoteBtn = document.getElementById("deleteNote");
const selectedDateLabel = document.getElementById("selectedDateLabel");
const syncStatus = document.getElementById("syncStatus");
const syncStatusDot = syncStatus.querySelector(".status-dot");
const syncStatusText = syncStatus.querySelector(".status-text");

const LOCAL_STORAGE_KEY = "shared_calendar_notes_v1";
const CALENDAR_ID = window.CALENDAR_ID || "default";

let state = {
  currentMonth: new Date(),
  selectedDate: new Date(),
  notes: new Map(),
  isSyncReady: false,
  isFirebaseEnabled: false,
  unsubscribe: null
};

let firestore = null;

init();

function init() {
  const storedNotes = loadLocalNotes();
  Object.entries(storedNotes).forEach(([date, text]) => {
    if (text) {
      state.notes.set(date, text);
    }
  });

  initFirebase();
  attachEvents();
  render();
  updateSelectedDate(state.selectedDate);
  registerServiceWorker();
}

function attachEvents() {
  prevMonthBtn.addEventListener("click", () => shiftMonth(-1));
  nextMonthBtn.addEventListener("click", () => shiftMonth(1));
  todayBtn.addEventListener("click", () => {
    state.currentMonth = new Date();
    updateSelectedDate(new Date());
    render();
  });

  saveNoteBtn.addEventListener("click", () => saveNote());
  deleteNoteBtn.addEventListener("click", () => deleteNote());

  noteInput.addEventListener("input", debounce(() => {
    autoSaveNote();
  }, 500));

  window.addEventListener("online", () => updateSyncStatus());
  window.addEventListener("offline", () => updateSyncStatus());
}

function initFirebase() {
  if (!window.firebase || !window.FIREBASE_CONFIG) {
    updateSyncStatus("Sin Firebase: usando almacenamiento local.");
    return;
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(window.FIREBASE_CONFIG);
  }

  firebase.auth().signInAnonymously()
    .then(() => {
      firestore = firebase.firestore();
      state.isFirebaseEnabled = true;
      updateSyncStatus("Conectando a Firebase…");
      subscribeToVisibleRange();
    })
    .catch(() => {
      updateSyncStatus("No se pudo conectar con Firebase.");
    });
}

function subscribeToVisibleRange() {
  if (!firestore) return;
  if (state.unsubscribe) {
    state.unsubscribe();
    state.unsubscribe = null;
  }

  const { startISO, endISO } = getGridRange(state.currentMonth);
  const notesRef = firestore
    .collection("calendars")
    .doc(CALENDAR_ID)
    .collection("notes");

  state.unsubscribe = notesRef
    .where("date", ">=", startISO)
    .where("date", "<=", endISO)
    .orderBy("date")
    .onSnapshot((snapshot) => {
      const incoming = new Map();
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data?.date && data?.text) {
          incoming.set(data.date, data.text);
        }
      });
      state.notes = mergeLocalAndRemote(incoming);
      updateSyncStatus("Sincronizado en tiempo real.");
      render();
    }, () => {
      updateSyncStatus("Error al escuchar cambios en Firebase.");
    });
}

function mergeLocalAndRemote(remoteNotes) {
  const local = loadLocalNotes();
  Object.entries(local).forEach(([date, text]) => {
    if (!remoteNotes.has(date) && text) {
      remoteNotes.set(date, text);
    }
  });
  return remoteNotes;
}

function render() {
  renderHeader();
  renderGrid();
}

function renderHeader() {
  const formatter = new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric"
  });
  const monthName = formatter.format(state.currentMonth);
  monthLabel.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const start = startOfMonth(state.currentMonth);
  const end = endOfMonth(state.currentMonth);
  monthRange.textContent = `${formatDateShort(start)} - ${formatDateShort(end)}`;
}

function renderGrid() {
  calendarGrid.innerHTML = "";
  const days = getCalendarDays(state.currentMonth);
  days.forEach((date) => {
    const iso = toISO(date);
    const isOutside = date.getMonth() !== state.currentMonth.getMonth();
    const isToday = isSameDay(date, new Date());
    const isSelected = isSameDay(date, state.selectedDate);
    const hasNote = state.notes.has(iso);

    const dayEl = document.createElement("button");
    dayEl.type = "button";
    dayEl.className = "day";
    if (isOutside) dayEl.classList.add("outside");
    if (isToday) dayEl.classList.add("today");
    if (isSelected) dayEl.classList.add("selected");
    if (hasNote) dayEl.classList.add("has-note");

    const numberEl = document.createElement("div");
    numberEl.className = "day-number";
    numberEl.textContent = date.getDate();

    const noteEl = document.createElement("div");
    noteEl.className = "note-preview";
    noteEl.textContent = state.notes.get(iso) || "Sin nota";

    dayEl.append(numberEl, noteEl);

    if (hasNote) {
      const indicator = document.createElement("span");
      indicator.className = "note-indicator";
      indicator.setAttribute("aria-label", "Nota guardada");
      dayEl.appendChild(indicator);
    }
    dayEl.addEventListener("click", () => updateSelectedDate(date));
    calendarGrid.appendChild(dayEl);
  });
}

function updateSelectedDate(date) {
  state.selectedDate = new Date(date);
  const iso = toISO(state.selectedDate);
  const formatter = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  selectedDateLabel.textContent = capitalize(formatter.format(state.selectedDate));
  noteInput.value = state.notes.get(iso) || "";
  renderGrid();
}

function saveNote() {
  const iso = toISO(state.selectedDate);
  const text = noteInput.value.trim();
  persistNote(iso, text);
}

function autoSaveNote() {
  const iso = toISO(state.selectedDate);
  const text = noteInput.value.trim();
  persistNote(iso, text, true);
}

function deleteNote() {
  const iso = toISO(state.selectedDate);
  noteInput.value = "";
  persistNote(iso, "");
}

function persistNote(iso, text, silent = false) {
  if (text) {
    state.notes.set(iso, text);
  } else {
    state.notes.delete(iso);
  }

  saveLocalNotes(Object.fromEntries(state.notes));

  if (!silent) {
    render();
  }

  if (state.isFirebaseEnabled) {
    const docRef = firestore
      .collection("calendars")
      .doc(CALENDAR_ID)
      .collection("notes")
      .doc(iso);

    if (text) {
      docRef.set({
        date: iso,
        text,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } else {
      docRef.delete();
    }
  }
}

function shiftMonth(delta) {
  const newDate = new Date(state.currentMonth);
  newDate.setMonth(newDate.getMonth() + delta);
  state.currentMonth = newDate;
  render();
  subscribeToVisibleRange();
}

function getCalendarDays(baseDate) {
  const start = startOfCalendarGrid(baseDate);
  const days = [];
  for (let i = 0; i < 42; i += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    days.push(day);
  }
  return days;
}

function startOfCalendarGrid(date) {
  const start = startOfMonth(date);
  const day = start.getDay() || 7;
  start.setDate(start.getDate() - (day - 1));
  return start;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function getGridRange(date) {
  const start = startOfCalendarGrid(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 41);
  return { startISO: toISO(start), endISO: toISO(end) };
}

function toISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateShort(date) {
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" }).format(date);
}

function isSameDay(a, b) {
  return a.toDateString() === b.toDateString();
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function updateSyncStatus(message) {
  if (message) {
    syncStatusText.textContent = message;
  }
  if (!navigator.onLine) {
    syncStatusDot.style.background = "#f97316";
    syncStatusText.textContent = "Sin conexión: guardando localmente.";
    return;
  }

  if (state.isFirebaseEnabled) {
    syncStatusDot.style.background = "#22c55e";
  } else {
    syncStatusDot.style.background = "#facc15";
  }
}

function loadLocalNotes() {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveLocalNotes(notes) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(notes));
}

function debounce(callback, wait) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => callback.apply(null, args), wait);
  };
}

function registerServiceWorker() {
  if (!(\"serviceWorker\" in navigator)) return;
  window.addEventListener(\"load\", () => {
    navigator.serviceWorker.register(\"sw.js\").catch(() => {});
  });
}
