const RAW_ES_TO_EN = {
  "agua": "water",
  "aceite": "oil",
  "aceite de oliva": "olive oil",
  "aceite de girasol": "sunflower oil",
  "aceite de coco": "coconut oil",
  "aceite de sésamo": "sesame oil",
  "vinagre": "vinegar",
  "vinagre balsamico": "balsamic vinegar",
  "vinagre de manzana": "apple cider vinegar",
  "sal": "salt",
  "pimienta": "pepper",
  "pimienta negra": "black pepper",
  "pimienta blanca": "white pepper",
  "azucar": "sugar",
  "azúcar moreno": "brown sugar",
  "miel": "honey",
  "mostaza": "mustard",
  "mayonesa": "mayonnaise",
  "ketchup": "ketchup",
  "salsa barbacoa": "barbecue sauce",
  "salsa de soja": "soy sauce",
  "salsa de soya": "soy sauce",
  "salsa de tomate": "tomato sauce",
  "caldo": "broth",
  "caldo de pollo": "chicken broth",
  "caldo de verduras": "vegetable broth",
  "caldo de carne": "beef broth",
  "vino blanco": "white wine",
  "vino tinto": "red wine",
  "cerveza": "beer",
  "limon": "lemon",
  "lima": "lime",
  "naranja": "orange",
  "manzana": "apple",
  "pera": "pear",
  "platano": "banana",
  "banana": "banana",
  "aguacate": "avocado",
  "piña": "pineapple",
  "mango": "mango",
  "fresa": "strawberry",
  "frambuesa": "raspberry",
  "mora": "blackberry",
  "uva": "grape",
  "coco": "coconut",
  "cebolla": "onion",
  "cebolla roja": "red onion",
  "cebolla morada": "red onion",
  "ajo": "garlic",
  "tomate": "tomato",
  "tomates": "tomato",
  "pimiento": "pepper",
  "pimiento rojo": "red pepper",
  "pimiento verde": "green pepper",
  "zanahoria": "carrot",
  "apio": "celery",
  "calabacin": "zucchini",
  "calabacín": "zucchini",
  "berenjena": "eggplant",
  "patata": "potato",
  "patatas": "potato",
  "batata": "sweet potato",
  "boniato": "sweet potato",
  "brocoli": "broccoli",
  "brócoli": "broccoli",
  "coliflor": "cauliflower",
  "espinaca": "spinach",
  "espinacas": "spinach",
  "lechuga": "lettuce",
  "repollo": "cabbage",
  "col": "cabbage",
  "champiñon": "mushroom",
  "champiñones": "mushroom",
  "seta": "mushroom",
  "guisante": "pea",
  "guisantes": "pea",
  "judia verde": "green bean",
  "judias verdes": "green bean",
  "judía verde": "green bean",
  "judías verdes": "green bean",
  "pepino": "cucumber",
  "maiz": "corn",
  "maíz": "corn",
  "calabaza": "pumpkin",
  "calabaza butternut": "butternut squash",
  "puerro": "leek",
  "espárrago": "asparagus",
  "esparrago": "asparagus",
  "esparragos": "asparagus",
  "alcachofa": "artichoke",
  "rabanito": "radish",
  "remolacha": "beet",
  "col rizada": "kale",
  "acelga": "chard",
  "nabo": "turnip",
  "garbanzo": "chickpea",
  "garbanzos": "chickpea",
  "lenteja": "lentil",
  "lentejas": "lentil",
  "alubia": "bean",
  "alubias": "bean",
  "judia": "bean",
  "judias": "bean",
  "frijol": "bean",
  "frijoles": "bean",
  "soja": "soy",
  "edamame": "edamame",
  "arroz": "rice",
  "pasta": "pasta",
  "espagueti": "spaghetti",
  "espaguetis": "spaghetti",
  "fideo": "noodle",
  "fideos": "noodle",
  "cuscus": "couscous",
  "cuscús": "couscous",
  "quinoa": "quinoa",
  "trigo": "wheat",
  "harina": "flour",
  "pan": "bread",
  "pan pita": "pita bread",
  "pan rallado": "breadcrumbs",
  "avena": "oats",
  "tortilla": "tortilla",
  "tortillas": "tortilla",
  "masa": "dough",
  "pollo": "chicken",
  "pechuga de pollo": "chicken breast",
  "muslo de pollo": "chicken thigh",
  "pavo": "turkey",
  "ternera": "beef",
  "carne de res": "beef",
  "cerdo": "pork",
  "lomo": "loin",
  "jamon": "ham",
  "jamón": "ham",
  "tocino": "bacon",
  "chorizo": "chorizo",
  "salchicha": "sausage",
  "cordero": "lamb",
  "conejo": "rabbit",
  "huevo": "egg",
  "huevos": "egg",
  "salmon": "salmon",
  "salmón": "salmon",
  "atun": "tuna",
  "atún": "tuna",
  "merluza": "hake",
  "bacalao": "cod",
  "gamba": "shrimp",
  "camarón": "shrimp",
  "camaron": "shrimp",
  "langostino": "shrimp",
  "mejillon": "mussel",
  "mejillones": "mussel",
  "almeja": "clam",
  "almejas": "clam",
  "pulpo": "octopus",
  "calamar": "squid",
  "trucha": "trout",
  "tomillo": "thyme",
  "romero": "rosemary",
  "perejil": "parsley",
  "cilantro": "cilantro",
  "albahaca": "basil",
  "oregano": "oregano",
  "orégano": "oregano",
  "comino": "cumin",
  "pimenton": "paprika",
  "pimentón": "paprika",
  "curry": "curry",
  "canela": "cinnamon",
  "jengibre": "ginger",
  "laurel": "bay leaf",
  "nuez moscada": "nutmeg",
  "clavo": "clove",
  "chile": "chili",
  "guindilla": "chili",
  "cayena": "cayenne pepper",
  "leche": "milk",
  "nata": "cream",
  "crema": "cream",
  "crema agria": "sour cream",
  "yogur": "yogurt",
  "mantequilla": "butter",
  "queso": "cheese",
  "queso crema": "cream cheese",
  "mozzarella": "mozzarella",
  "parmesano": "parmesan",
  "cheddar": "cheddar",
  "ricotta": "ricotta",
  "feta": "feta",
  "almendra": "almond",
  "almendras": "almond",
  "nuez": "walnut",
  "nueces": "walnut",
  "avellana": "hazelnut",
  "avellanas": "hazelnut",
  "cacahuete": "peanut",
  "cacahuetes": "peanut",
  "semilla de sesamo": "sesame",
  "sésamo": "sesame",
  "chia": "chia",
  "tofu": "tofu",
  "tempeh": "tempeh",
  "maiz dulce": "sweet corn",
  "salsa pesto": "pesto",
  "aceituna": "olive",
  "aceitunas": "olive",
  "alcaparra": "capers",
  "alcaparras": "capers",
  "pesto": "pesto",
  "pasas": "raisin",
  "pasas de uva": "raisin",
  "salsa picante": "hot sauce",
  "levadura": "yeast",
  "polvo de hornear": "baking powder",
  "vainilla": "vanilla",
  "cacao": "cocoa",
  "chocolate": "chocolate",
  "tomate seco": "sun-dried tomato",
  "tomate cherry": "cherry tomato",
  "cebollino": "chives",
  "salsa tahini": "tahini",
  "tahini": "tahini",
  "pasta de miso": "miso",
  "miso": "miso"
};

const STOP_INGREDIENTS = new Set(["salt", "pepper", "water", "oil"]);
const TOKEN_IGNORES = new Set([
  "fresh",
  "ground",
  "chopped",
  "minced",
  "diced",
  "sliced",
  "boneless",
  "skinless",
  "large",
  "small",
  "medium",
  "optional",
  "taste",
  "extra",
  "virgin",
  "low",
  "fat",
  "reduced",
  "lean",
  "grated",
  "shredded"
]);

const EN_CONNECTORS = {
  with: "con",
  and: "y",
  of: "de",
  in: "en",
  style: "estilo",
  "&": "y",
  "-": "-"
};

function normalizeText(value) {
  if (!value) return "";
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function singularize(token) {
  if (token.length <= 3) return token;
  if (token.endsWith("ses")) return token;
  if (token.endsWith("es") && token.length > 4) {
    return token.slice(0, -2);
  }
  if (token.endsWith("s") && token.length > 3) {
    return token.slice(0, -1);
  }
  return token;
}

function buildDictionary(raw) {
  const map = new Map();
  Object.entries(raw).forEach(([es, en]) => {
    const key = normalizeText(es);
    if (!key) return;
    map.set(key, en);
  });
  return map;
}

const ES_TO_EN = buildDictionary(RAW_ES_TO_EN);
const EN_TO_ES = new Map();
ES_TO_EN.forEach((value, key) => {
  const normalizedEn = normalizeText(value);
  if (!EN_TO_ES.has(normalizedEn)) {
    EN_TO_ES.set(normalizedEn, key);
  }
});

function translateTermToEnglish(term) {
  const normalized = normalizeText(term);
  if (!normalized) return { translated: "", missing: false };
  const translated = ES_TO_EN.get(normalized);
  if (translated) {
    return { translated, missing: false };
  }
  return { translated: normalized, missing: true };
}

function translateTermToSpanish(term) {
  const normalized = normalizeText(term);
  if (!normalized) return "";
  const translated = EN_TO_ES.get(normalized);
  return translated ? translated : term;
}

function buildIngredientTokens(ingredient) {
  const normalized = normalizeText(ingredient);
  if (!normalized) return [];
  const tokens = normalized.split(" ").map((token) => singularize(token));
  const filtered = tokens.filter(
    (token) => token && !STOP_INGREDIENTS.has(token) && !TOKEN_IGNORES.has(token)
  );
  return Array.from(new Set([normalized, ...filtered]));
}

function buildIngredientSet(list) {
  const set = new Set();
  list.forEach((ingredient) => {
    buildIngredientTokens(ingredient).forEach((token) => set.add(token));
  });
  return set;
}

function jaccardSimilarity(setA, setB) {
  if (!setA.size || !setB.size) return 0;
  let intersection = 0;
  setA.forEach((value) => {
    if (setB.has(value)) intersection += 1;
  });
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function translateTitleToSpanish(title) {
  const normalized = normalizeText(title);
  const direct = EN_TO_ES.get(normalized);
  if (direct) {
    return capitalizeText(direct);
  }
  const words = normalized.split(" ").map((word) => {
    if (EN_CONNECTORS[word]) return EN_CONNECTORS[word];
    const translated = EN_TO_ES.get(word);
    return translated ? translated : word;
  });
  return capitalizeText(words.join(" "));
}

function translateIngredientsToSpanish(ingredients) {
  return ingredients.map((ingredient) => {
    const normalized = normalizeText(ingredient);
    const direct = EN_TO_ES.get(normalized);
    if (direct) return direct;
    const parts = normalized.split(" ").map((word) => {
      if (EN_CONNECTORS[word]) return EN_CONNECTORS[word];
      const translated = EN_TO_ES.get(word);
      return translated ? translated : word;
    });
    return parts.join(" ");
  });
}

function capitalizeText(text) {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function prepareRecommender(recipes) {
  const index = new Map();
  const normalizedRecipes = recipes.map((recipe, idx) => {
    const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
    const ingredientSet = buildIngredientSet(ingredients);
    ingredientSet.forEach((token) => {
      if (!index.has(token)) {
        index.set(token, new Set());
      }
      index.get(token).add(idx);
    });
    return {
      ...recipe,
      normalizedIngredients: ingredientSet
    };
  });
  return { index, normalizedRecipes };
}

function suggestRecipes(ingredientsEs, recommenderData) {
  const terms = ingredientsEs
    .split(/[,;\n]+/)
    .map((term) => term.trim())
    .filter(Boolean);
  const missing = [];
  const translated = terms.map((term) => {
    const { translated: value, missing: isMissing } = translateTermToEnglish(term);
    if (isMissing) missing.push(term);
    return value;
  });
  const userSet = buildIngredientSet(translated);
  const candidates = new Set();
  userSet.forEach((token) => {
    const matches = recommenderData.index.get(token);
    if (matches) {
      matches.forEach((idx) => candidates.add(idx));
    }
  });
  const results = [];
  candidates.forEach((idx) => {
    const recipe = recommenderData.normalizedRecipes[idx];
    const score = jaccardSimilarity(userSet, recipe.normalizedIngredients);
    if (score > 0) {
      results.push({ recipe, score });
    }
  });
  results.sort((a, b) => b.score - a.score);
  return {
    results: results.slice(0, 10),
    missing,
    translatedTerms: translated
  };
}

export {
  prepareRecommender,
  suggestRecipes,
  translateTitleToSpanish,
  translateIngredientsToSpanish,
  translateTermToSpanish,
  normalizeText
};
