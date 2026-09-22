/**
 * CrossFit Movement Finder
 * Vanilla JS, sin dependencias. Todo el estado vive en `state`;
 * cada cambio (búsqueda, filtro) vuelve a renderizar la lista completa.
 */

const DATA_URL = "data/movements.json";

const state = {
  movements: [],
  query: "",
  category: "all",
};

const els = {
  statusText: document.getElementById("status-text"),
  searchInput: document.getElementById("search-input"),
  clearSearch: document.getElementById("clear-search"),
  filters: document.getElementById("filters"),
  resultMeta: document.getElementById("result-meta"),
  results: document.getElementById("results"),
  emptyState: document.getElementById("empty-state"),
  resetSearch: document.getElementById("reset-search"),
  modalBackdrop: document.getElementById("modal-backdrop"),
  modal: document.getElementById("modal"),
  modalBadge: document.getElementById("modal-badge"),
  modalTitle: document.getElementById("modal-title"),
  modalVideo: document.getElementById("modal-video"),
  modalFooter: document.getElementById("modal-footer"),
  modalClose: document.getElementById("modal-close"),
};

let lastFocusedElement = null;

const CATEGORY_STYLE = {
  Weightlifting: { color: "var(--amber)", border: "var(--amber-border)", soft: "var(--amber-soft)" },
  Gymnastics: { color: "var(--sky)", border: "var(--sky-border)", soft: "var(--sky-soft)" },
  Monostructural: { color: "var(--violet)", border: "var(--violet-border)", soft: "var(--violet-soft)" },
};

/* ---------------- normalización / búsqueda ---------------- */

function normalize(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function matchesQuery(movement, normalizedQuery) {
  if (!normalizedQuery) return true;

  const haystack = [
    movement.name,
    movement.abbreviation,
    movement.id,
    ...(movement.aliases || []),
    ...(movement.keywords || []),
  ]
    .filter(Boolean)
    .map(normalize);

  return haystack.some((field) => field.includes(normalizedQuery));
}

function matchesCategory(movement, category) {
  if (category === "all") return true;
  return (movement.categories || []).includes(category);
}

function getFilteredMovements() {
  const normalizedQuery = normalize(state.query.trim());
  return state.movements
    .filter((m) => matchesCategory(m, state.category))
    .filter((m) => matchesQuery(m, normalizedQuery))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/* ---------------- filtros: pills con conteo real ---------------- */

function buildFilterPills() {
  const counts = { all: state.movements.length };
  ["Weightlifting", "Gymnastics", "Monostructural"].forEach((cat) => {
    counts[cat] = state.movements.filter((m) => (m.categories || []).includes(cat)).length;
  });

  els.filters.innerHTML = "";
  const defs = [
    { key: "all", label: "Todos", dot: null },
    { key: "Weightlifting", label: "Weightlifting", dot: "cat-weightlifting" },
    { key: "Gymnastics", label: "Gymnastics", dot: "cat-gymnastics" },
    { key: "Monostructural", label: "Monostructural", dot: "cat-monostructural" },
  ];

  defs.forEach((def) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.dataset.category = def.key;
    btn.setAttribute("aria-pressed", String(def.key === state.category));

    if (def.dot) {
      const dot = document.createElement("span");
      dot.className = `chip-dot ${def.dot}`;
      btn.appendChild(dot);
    }

    const label = document.createElement("span");
    label.textContent = def.label;
    btn.appendChild(label);

    const count = document.createElement("span");
    count.className = "chip-count";
    count.textContent = counts[def.key];
    btn.appendChild(count);

    btn.addEventListener("click", () => setCategory(def.key));
    els.filters.appendChild(btn);
  });
}

function setCategory(category) {
  state.category = category;
  [...els.filters.querySelectorAll(".chip")].forEach((chip) => {
    chip.setAttribute("aria-pressed", String(chip.dataset.category === category));
  });
  renderResults();
}

/* ---------------- render de resultados ---------------- */

function primaryCategoryStyle(movement) {
  const cat = (movement.categories || [])[0];
  return CATEGORY_STYLE[cat] || CATEGORY_STYLE.Weightlifting;
}

function renderResults() {
  const filtered = getFilteredMovements();

  els.resultMeta.textContent =
    filtered.length === 1
      ? "1 movimiento encontrado"
      : `${filtered.length} movimientos encontrados`;

  els.results.innerHTML = "";
  els.emptyState.hidden = filtered.length !== 0;
  els.results.hidden = filtered.length === 0;

  const fragment = document.createDocumentFragment();
  filtered.forEach((movement) => fragment.appendChild(buildCard(movement)));
  els.results.appendChild(fragment);
}

function buildCard(movement) {
  const li = document.createElement("li");
  li.className = "card";

  const style = primaryCategoryStyle(movement);
  li.style.setProperty("--cat-color", style.color);
  li.style.setProperty("--cat-border", style.border);
  li.style.setProperty("--cat-soft", style.soft);

  const tags = document.createElement("div");
  tags.className = "card-tags";
  (movement.categories || []).forEach((label) => {
    const tag = document.createElement("span");
    tag.className = "tag tag-cat";
    tag.textContent = label;
    tags.appendChild(tag);
  });
  (movement.equipment || []).forEach((label) => {
    const tag = document.createElement("span");
    tag.className = "tag tag-equip";
    tag.textContent = label;
    tags.appendChild(tag);
  });
  li.appendChild(tags);

  const heading = document.createElement("div");
  heading.className = "card-heading";

  const name = document.createElement("h2");
  name.className = "card-name";
  name.textContent = movement.name;
  heading.appendChild(name);

  if (movement.abbreviation) {
    const abbr = document.createElement("span");
    abbr.className = "card-abbr";
    abbr.textContent = movement.abbreviation;
    heading.appendChild(abbr);
  }
  li.appendChild(heading);

  const actions = document.createElement("div");
  actions.className = "card-actions";
  actions.appendChild(buildActionButton(movement));
  li.appendChild(actions);

  return li;
}

function buildActionButton(movement) {
  if (movement.youtubeId) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-demo";
    btn.innerHTML = `${icon("play")}<span>Ver demostración</span>`;
    btn.addEventListener("click", () => openModal(movement));
    return btn;
  }

  if (movement.sourceUrl) {
    const link = document.createElement("a");
    link.className = "btn-demo";
    link.href = movement.sourceUrl;
    link.target = "_blank";
    link.rel = "noopener";
    link.innerHTML = `${icon("external")}<span>Ver fuente oficial</span>`;
    return link;
  }

  const pending = document.createElement("span");
  pending.className = "demo-pending";
  pending.textContent = "Demostración no disponible";
  return pending;
}

/* ---------------- íconos inline (sin dependencias) ---------------- */

const ICONS = {
  search:
    '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  close:
    '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>',
  play:
    '<svg class="icon" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5v14l12-7z"/></svg>',
  external:
    '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/></svg>',
  searchOff:
    '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="8" x2="14" y2="14"/></svg>',
  barbell:
    '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h2"/><path d="M6 8v8"/><path d="M9 6v12"/><path d="M9 12h6"/><path d="M15 6v12"/><path d="M18 8v8"/><path d="M22 12h-2"/></svg>',
};

function icon(name) {
  return ICONS[name] || "";
}

/* ---------------- modal (lazy iframe) ---------------- */

function openModal(movement) {
  lastFocusedElement = document.activeElement;

  const style = primaryCategoryStyle(movement);
  els.modal.style.setProperty("--cat-color", style.color);

  const cat = (movement.categories || [])[0] || "";
  els.modalBadge.textContent = cat;
  els.modalTitle.textContent = movement.name;

  els.modalVideo.innerHTML = "";
  const iframe = document.createElement("iframe");
  iframe.src = `https://www.youtube-nocookie.com/embed/${movement.youtubeId}?autoplay=1&rel=0&modestbranding=1`;
  iframe.title = `Demostración: ${movement.name}`;
  iframe.allow =
    "accelerated-sensors; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  els.modalVideo.appendChild(iframe);

  els.modalFooter.innerHTML = "";
  if (movement.sourceUrl) {
    const link = document.createElement("a");
    link.href = movement.sourceUrl;
    link.target = "_blank";
    link.rel = "noopener";
    link.innerHTML = `<span>Ver fuente oficial</span>${icon("external")}`;
    els.modalFooter.appendChild(link);
  }

  els.modalBackdrop.hidden = false;
  document.body.style.overflow = "hidden";
  els.modalClose.focus();

  setBackgroundInert(true);
  document.addEventListener("keydown", handleModalKeydown);
  document.addEventListener("keydown", trapModalFocus);
}

function closeModal() {
  els.modalBackdrop.hidden = true;
  document.body.style.overflow = "";
  els.modalVideo.innerHTML = ""; // corta la reproducción al cerrar

  setBackgroundInert(false);
  document.removeEventListener("keydown", handleModalKeydown);
  document.removeEventListener("keydown", trapModalFocus);

  if (lastFocusedElement) {
    lastFocusedElement.focus();
  }
}

// Marca como inert todo lo que está fuera del modal mientras está abierto,
// para que Tab/lectores de pantalla no puedan llegar al contenido de fondo.
// Los navegadores sin soporte de `inert` simplemente ignoran la propiedad;
// trapModalFocus() de abajo cubre ese caso igual, vía teclado.
function setBackgroundInert(isInert) {
  [...document.body.children].forEach((el) => {
    if (el !== els.modalBackdrop) {
      el.inert = isInert;
    }
  });
}

// Fallback manual del focus trap: mientras el modal está abierto, Tab y
// Shift+Tab solo circulan entre los elementos interactivos del modal.
function trapModalFocus(event) {
  if (event.key !== "Tab") return;

  const focusable = els.modal.querySelectorAll(
    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  const list = [...focusable].filter((el) => el.offsetParent !== null);
  if (list.length === 0) return;

  const first = list[0];
  const last = list[list.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function handleModalKeydown(event) {
  if (event.key === "Escape") {
    closeModal();
  }
}

els.modalClose.addEventListener("click", closeModal);
els.modalBackdrop.addEventListener("click", (event) => {
  if (event.target === els.modalBackdrop) {
    closeModal();
  }
});

/* ---------------- búsqueda + URL ---------------- */

function setQuery(value, { syncUrl = true } = {}) {
  state.query = value;
  els.clearSearch.hidden = value.length === 0;
  renderResults();

  if (syncUrl) {
    const params = new URLSearchParams(window.location.search);
    if (value) {
      params.set("search", value);
    } else {
      params.delete("search");
    }
    const newSearch = params.toString();
    const newUrl =
      window.location.pathname + (newSearch ? `?${newSearch}` : "") + window.location.hash;
    window.history.replaceState({}, "", newUrl);
  }
}

els.searchInput.addEventListener("input", (event) => {
  setQuery(event.target.value);
});

els.clearSearch.addEventListener("click", () => {
  els.searchInput.value = "";
  setQuery("");
  els.searchInput.focus();
});

els.resetSearch.addEventListener("click", () => {
  els.searchInput.value = "";
  setQuery("");
  setCategory("all");
  els.searchInput.focus();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && els.modalBackdrop.hidden && state.query) {
    els.searchInput.value = "";
    setQuery("");
  }
});

/* ---------------- carga inicial ---------------- */

async function init() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`No se pudo cargar ${DATA_URL}`);
    state.movements = await response.json();
  } catch (error) {
    els.resultMeta.textContent = "No se pudieron cargar los movimientos.";
    els.statusText.textContent = "Error de carga";
    console.error(error);
    return;
  }

  els.statusText.textContent = `Ready / ${state.movements.length} movimientos`;
  buildFilterPills();

  const paramsQuery = new URLSearchParams(window.location.search).get("search") || "";
  if (paramsQuery) {
    els.searchInput.value = paramsQuery;
  }
  setQuery(paramsQuery, { syncUrl: false });
}

init();

/* ---------------- PWA: registro del service worker ---------------- */

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((error) => {
      console.error("No se pudo registrar el service worker:", error);
    });
  });
}
