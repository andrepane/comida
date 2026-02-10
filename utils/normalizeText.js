export function normalizeText(value = "") {
  const text = String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!text) return "";

  const normalized = typeof text.normalize === "function" ? text.normalize("NFD") : text;
  return normalized.replace(/[\u0300-\u036f]/g, "");
}
