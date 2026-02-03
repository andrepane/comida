# Calendario de comidas

Aplicación web simple para planificar **comida** y **cena** en 14 días (semana actual + siguiente) con sincronización en tiempo real usando Firebase Auth anónima y Cloud Firestore.

## Compartir un calendario
- Arriba verás el **Código** del calendario actual.
- Pulsa **Copiar código** y compártelo con otra persona.
- En otro dispositivo, introduce el código en **Unirse con código** y pulsa **Unirse**.
- El código se guarda en `localStorage` y todos los cambios se sincronizan al instante.

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
