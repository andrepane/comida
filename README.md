# Calendario de comidas

Aplicación web simple para planificar **comida** y **cena** en 14 días (semana actual + siguiente) con sincronización en tiempo real usando Firebase Auth anónima y Cloud Firestore en un único calendario compartido.

## Mejoras recientes
- La lista de la compra ahora se guarda en `localStorage`, manteniendo categorías y elementos comprados entre sesiones.
- El tema inicial respeta `prefers-color-scheme` cuando no hay una preferencia guardada.

## Requisitos de Firebase
- Autenticación anónima habilitada en Firebase Auth.
- Cloud Firestore habilitado con reglas que permitan leer/escribir en `calendars/{calendarId}/days/{yyyy-mm-dd}`.

## Estructura de datos (obligatoria)
```
calendars/{calendarId}/days/{yyyy-mm-dd} -> {
  lunch: string,
  dinner: string,
  updatedAt: serverTimestamp(),
  updatedBy: uid
}
```

> Nota: la app **solo** escribe `lunch`, `dinner`, `updatedAt` y `updatedBy` para cumplir con las reglas.

## ID del calendario compartido
El calendario usa un único ID fijo (`calendario-compartido`) definido en `app.js`. Si quieres cambiarlo, actualiza ese valor y reutiliza el mismo en todas tus instalaciones.
