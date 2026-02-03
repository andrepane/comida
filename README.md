# Calendario de comidas

Aplicación web simple para planificar **comida** y **cena** en 14 días (semana actual + siguiente) con sincronización en tiempo real usando Firebase Auth anónima y Cloud Firestore en un único calendario compartido.

## Mejoras recientes
- La lista de la compra ahora se guarda en `localStorage`, manteniendo categorías y elementos comprados entre sesiones.
- El tema inicial respeta `prefers-color-scheme` cuando no hay una preferencia guardada.
- Se añadió la sección de **Recetas sugeridas** con dataset local y recomendaciones por similitud.

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

## Recetas sugeridas (MVP)
La sección **Recetas** usa un dataset local en inglés (`data/recipes_en.json`) y una lógica de similitud Jaccard para sugerir recetas en español. No se usan APIs externas.

### Ampliar el dataset
1. Abre `data/recipes_en.json`.
2. Añade nuevas entradas siguiendo el formato:
   ```json
   { "id": "r061", "title": "Title in English", "ingredients": ["..."], "instructions": "..." }
   ```
3. Guarda el archivo. La app lo cargará al iniciar la sección de recetas.

### Ampliar el diccionario de traducción
1. Abre `modules/recommender.js`.
2. Edita el objeto `RAW_ES_TO_EN` con nuevos pares `\"español\": \"english\"`.
3. La app genera el diccionario inverso automáticamente para mostrar títulos e ingredientes en español.
