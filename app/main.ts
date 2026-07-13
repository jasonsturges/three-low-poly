import "./style.css";
import type { ExampleCleanup, ExampleMeta, ExampleMount } from "./framework/example";

interface ExampleModule {
  default: ExampleMount;
  meta?: ExampleMeta;
}

interface ExampleEntry {
  id: string; // full path id, e.g. "models/vessels/wine-bottle"
  title: string; // leaf label, e.g. "Wine Bottle"
  segments: string[]; // path split, e.g. ["models", "vessels", "wine-bottle"]
  load: () => Promise<ExampleModule>;
}

/** A folder node in the sidebar tree: child folders plus leaf examples. */
interface TreeGroup {
  label: string;
  groups: Map<string, TreeGroup>;
  examples: ExampleEntry[];
}

/**
 * Auto-discovery: every `*.ts` under `examples/` becomes a gallery entry, lazily
 * loaded. Adding an example is just dropping a file in — there is no index to
 * maintain. The sidebar mirrors the folder structure at any depth (see the tree
 * build below); titles are derived from the path.
 */
const modules = import.meta.glob<ExampleModule>("./examples/**/*.ts");

const titleCase = (segment: string): string =>
  segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const examples: ExampleEntry[] = Object.entries(modules)
  .map(([path, load]): ExampleEntry => {
    const id = path.replace(/^\.\/examples\//, "").replace(/\.ts$/, "");
    const segments = id.split("/");
    return {
      id,
      title: titleCase(segments[segments.length - 1]),
      segments,
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
document.getElementById("example-count")!.textContent = String(examples.length);

const linkById = new Map<string, HTMLAnchorElement>();

// Build a tree mirroring the folders: every path segment but the last is a
// folder (a heading); the last is the example (a link). Depth is arbitrary, so
// a flat `fence/x` and a nested `models/vessels/x` coexist naturally.
const tree: TreeGroup = { label: "", groups: new Map(), examples: [] };
for (const example of examples) {
  let node = tree;
  for (const folder of example.segments.slice(0, -1)) {
    let child = node.groups.get(folder);
    if (!child) {
      child = { label: titleCase(folder), groups: new Map(), examples: [] };
      node.groups.set(folder, child);
    }
    node = child;
  }
  node.examples.push(example);
}

function createLink(example: ExampleEntry, indent: number): HTMLElement {
  const item = document.createElement("div");
  item.className = "nav-item";

  const link = document.createElement("a");
  link.className = "nav-link";
  link.href = `#/${example.id}`;
  link.textContent = example.title;
  link.dataset.id = example.id;
  link.dataset.search = `${example.id.replace(/\//g, " ")} ${example.title}`.toLowerCase();
  link.style.setProperty("--indent", String(indent));
  linkById.set(example.id, link);
  item.appendChild(link);
  return item;
}

// A section wraps its heading, its leaf links, and any nested sections, so the
// whole subtree hides as a unit during search. `depth` drives the heading tier
// (0 = uppercase section, 1+ = softer sub-heading) and the indent.
function renderGroup(group: TreeGroup, depth: number): HTMLElement {
  const section = document.createElement("div");
  section.className = "nav-section";
  section.dataset.depth = String(depth);
  section.style.setProperty("--indent", String(depth));

  const heading = document.createElement("div");
  heading.className = "nav-heading";
  heading.dataset.depth = String(depth);
  heading.style.setProperty("--indent", String(depth));
  heading.textContent = group.label;
  section.appendChild(heading);

  for (const example of group.examples) section.appendChild(createLink(example, depth + 1));
  for (const child of group.groups.values()) section.appendChild(renderGroup(child, depth + 1));
  return section;
}

for (const example of tree.examples) nav.appendChild(createLink(example, 0));
for (const group of tree.groups.values()) nav.appendChild(renderGroup(group, 0));

const noResults = document.createElement("div");
noResults.className = "nav-empty";
noResults.textContent = "No examples found";
noResults.setAttribute("role", "status");
noResults.hidden = true;
nav.appendChild(noResults);

search.addEventListener("input", () => {
  const term = search.value.trim().toLowerCase();
  let visibleCount = 0;
  for (const link of linkById.values()) {
    const match = !term || (link.dataset.search ?? "").includes(term);
    link.parentElement?.classList.toggle("hidden", !match);
    if (match) visibleCount++;
  }
  // Hide any section (at any depth) whose descendant links are all hidden.
  nav.querySelectorAll<HTMLElement>(".nav-section").forEach((section) => {
    const items = section.querySelectorAll<HTMLElement>(".nav-item");
    const anyVisible = Array.from(items).some((item) => !item.classList.contains("hidden"));
    section.classList.toggle("hidden", !anyVisible);
  });
  noResults.hidden = visibleCount > 0;
});

//------------------------------
//  Router
//------------------------------

let cleanup: ExampleCleanup | null = null;
let activeLink: HTMLAnchorElement | null = null;
// Guards against an async load resolving after the user has already navigated on.
let loadToken = 0;

const infoButton = document.createElement("button");
infoButton.className = "example-info-button";
infoButton.type = "button";
infoButton.textContent = "i";
infoButton.title = "About this example";
infoButton.setAttribute("aria-label", "About this example");
infoButton.setAttribute("aria-controls", "example-info-card");
infoButton.setAttribute("aria-expanded", "false");

const infoCard = document.createElement("aside");
infoCard.id = "example-info-card";
infoCard.className = "example-info-card";
infoCard.setAttribute("role", "note");
infoCard.hidden = true;
layout.appendChild(infoCard);

function closeInfo(): void {
  infoCard.hidden = true;
  infoButton.setAttribute("aria-expanded", "false");
}

function openInfo(): void {
  const sidebar = document.getElementById("sidebar")!;
  const buttonRect = infoButton.getBoundingClientRect();
  const sidebarRect = sidebar.getBoundingClientRect();

  infoCard.hidden = false;
  infoCard.style.left = `${sidebarRect.right + 10}px`;
  infoCard.style.top = `${Math.min(buttonRect.top, window.innerHeight - infoCard.offsetHeight - 12)}px`;
  infoButton.setAttribute("aria-expanded", "true");
}

infoButton.addEventListener("click", () => {
  if (infoCard.hidden) openInfo();
  else closeInfo();
});

document.addEventListener("pointerdown", (event) => {
  if (!infoCard.hidden && !infoCard.contains(event.target as Node) && event.target !== infoButton) closeInfo();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeInfo();
});

nav.addEventListener("scroll", closeInfo, { passive: true });

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
  closeInfo();
  infoButton.remove();

  activeLink?.classList.remove("active");
  activeLink?.classList.remove("has-description");
  activeLink?.removeAttribute("aria-current");
  activeLink = id ? linkById.get(id) ?? null : null;
  activeLink?.classList.add("active");
  activeLink?.setAttribute("aria-current", "page");
  activeLink?.scrollIntoView({ block: "nearest", inline: "nearest" });

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

    const host = document.createElement("div");
    host.className = "viewer-host";
    viewer.appendChild(host);

    if (module.meta?.description && activeLink) {
      activeLink.classList.add("has-description");
      activeLink.parentElement?.appendChild(infoButton);
      infoCard.replaceChildren();

      const title = document.createElement("strong");
      title.textContent = entry.title;
      const description = document.createElement("p");
      description.textContent = module.meta.description;
      infoCard.append(title, description);
    }

    const result = module.default(host);
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

const toggle = document.getElementById("toggle")!;
toggle.addEventListener("click", () => {
  closeInfo();
  layout.classList.toggle("collapsed");
  toggle.setAttribute("aria-expanded", String(!layout.classList.contains("collapsed")));
});
