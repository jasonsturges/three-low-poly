import "./style.css";
import type { ExampleCleanup, ExampleMeta, ExampleMount } from "./framework/example";

interface ExampleModule {
  default: ExampleMount;
  meta?: ExampleMeta;
}

interface ExampleEntry {
  id: string; // e.g. "fence/wrought-iron-fence"
  category: string; // e.g. "Fence"
  title: string; // e.g. "Wrought Iron Fence"
  load: () => Promise<ExampleModule>;
}

/**
 * Auto-discovery: every `*.ts` under `examples/` becomes a gallery entry, lazily
 * loaded. Adding an example is just dropping a file in — there is no index to
 * maintain. Category and title are derived from the path; an example may export
 * `meta` to override the title.
 */
const modules = import.meta.glob<ExampleModule>("./examples/**/*.ts");

const titleCase = (segment: string): string =>
  segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const examples: ExampleEntry[] = Object.entries(modules)
  .map(([path, load]): ExampleEntry => {
    const id = path.replace(/^\.\/examples\//, "").replace(/\.ts$/, "");
    const [category, ...rest] = id.split("/");
    return {
      id,
      category: titleCase(category),
      title: titleCase(rest.join(" / ") || category),
      load: load as () => Promise<ExampleModule>,
    };
  })
  .sort((a, b) => a.id.localeCompare(b.id));

//------------------------------
//  Sidebar
//------------------------------

const layout = document.getElementById("layout")!;
const nav = document.getElementById("nav")!;
const viewer = document.getElementById("viewer")!;
const search = document.getElementById("search") as HTMLInputElement;

const linkById = new Map<string, HTMLAnchorElement>();

let currentCategory = "";
for (const example of examples) {
  if (example.category !== currentCategory) {
    currentCategory = example.category;
    const heading = document.createElement("div");
    heading.className = "nav-category";
    heading.textContent = currentCategory;
    heading.dataset.category = currentCategory;
    nav.appendChild(heading);
  }
  const link = document.createElement("a");
  link.className = "nav-link";
  link.href = `#/${example.id}`;
  link.textContent = example.title;
  link.dataset.id = example.id;
  link.dataset.search = `${example.category} ${example.title}`.toLowerCase();
  nav.appendChild(link);
  linkById.set(example.id, link);
}

search.addEventListener("input", () => {
  const term = search.value.trim().toLowerCase();
  for (const link of linkById.values()) {
    const match = !term || (link.dataset.search ?? "").includes(term);
    link.classList.toggle("hidden", !match);
  }
  // Hide category headings that have no visible links beneath them.
  nav.querySelectorAll<HTMLElement>(".nav-category").forEach((heading) => {
    let sibling = heading.nextElementSibling;
    let anyVisible = false;
    while (sibling && sibling.classList.contains("nav-link")) {
      if (!sibling.classList.contains("hidden")) anyVisible = true;
      sibling = sibling.nextElementSibling;
    }
    heading.classList.toggle("hidden", !anyVisible);
  });
});

//------------------------------
//  Router
//------------------------------

let cleanup: ExampleCleanup | null = null;
let activeLink: HTMLAnchorElement | null = null;
// Guards against an async load resolving after the user has already navigated on.
let loadToken = 0;

function showEmpty(message: string): void {
  const empty = document.createElement("div");
  empty.className = "viewer-empty";
  empty.textContent = message;
  viewer.appendChild(empty);
}

async function route(): Promise<void> {
  const id = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
  const token = ++loadToken;

  if (cleanup) {
    cleanup();
    cleanup = null;
  }
  viewer.replaceChildren();

  activeLink?.classList.remove("active");
  activeLink = id ? linkById.get(id) ?? null : null;
  activeLink?.classList.add("active");

  if (!id) {
    showEmpty("Select an example");
    return;
  }
  const entry = examples.find((e) => e.id === id);
  if (!entry) {
    showEmpty(`Unknown example: ${id}`);
    return;
  }

  try {
    const module = await entry.load();
    if (token !== loadToken) return; // navigated away mid-load
    const result = module.default(viewer);
    cleanup = typeof result === "function" ? result : null;
  } catch (error) {
    if (token !== loadToken) return;
    console.error(error);
    showEmpty(`Failed to load "${entry.title}" — see console.`);
  }
}

window.addEventListener("hashchange", route);

// Default to the first example so the viewer is never blank on first load.
if (!location.hash && examples.length > 0) {
  location.replace(`#/${examples[0].id}`);
}
void route();

//------------------------------
//  Sidebar collapse
//------------------------------

document.getElementById("toggle")!.addEventListener("click", () => {
  layout.classList.toggle("collapsed");
});
