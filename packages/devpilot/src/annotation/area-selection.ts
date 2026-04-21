import type {
  DevPilotRect,
} from "../types";

export const ROOT_ATTR = "data-devpilot-root";
export const HOST_ATTR = "data-devpilot-host";

const AREA_MATCH_SELECTOR = [
  "button",
  "a",
  "input",
  "select",
  "textarea",
  "img",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "label",
  "td",
  "th",
  "[role='button']",
  "[role='link']",
  "[role='tab']",
  "[role='checkbox']",
  "[role='radio']",
  "[role='option']",
  "[role='switch']",
  "[role='combobox']",
  "[role='cell']",
  "[role='row']",
].join(", ");

const AREA_PREVIEW_SELECTOR = [
  "button",
  "a",
  "input",
  "select",
  "textarea",
  "img",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "label",
  "td",
  "th",
  "div",
  "span",
  "section",
  "article",
  "aside",
  "nav",
  "[role='button']",
  "[role='link']",
  "[role='tab']",
  "[role='checkbox']",
  "[role='radio']",
  "[role='option']",
  "[role='switch']",
  "[role='combobox']",
].join(", ");

const AREA_NESTED_CONTENT_SELECTOR = [
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "button",
  "a",
  "input",
  "select",
  "textarea",
  "label",
  "td",
  "th",
  "[role='button']",
  "[role='link']",
  "[role='tab']",
  "[role='checkbox']",
  "[role='radio']",
  "[role='option']",
  "[role='switch']",
  "[role='combobox']",
].join(", ");

const AREA_PREVIEW_MEANINGFUL_TAGS = new Set([
  "button",
  "a",
  "input",
  "select",
  "textarea",
  "img",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "label",
  "td",
  "th",
  "section",
  "article",
  "aside",
  "nav",
]);

const AREA_INTERACTIVE_ROLES = new Set([
  "button",
  "link",
  "tab",
  "checkbox",
  "radio",
  "option",
  "switch",
  "combobox",
  "cell",
  "row",
]);

const AREA_SEMANTIC_TAGS = new Set([
  "button",
  "input",
  "select",
  "textarea",
  "label",
  "a",
  "img",
  "td",
  "th",
  "li",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
]);

const AREA_FRAGMENT_PATTERN =
  /(?:^|[\s:_-])(icon|icons|suffix|prefix|thumb|track|handle|arrow|caret|clear|close|loading|spinner|addon|append|prepend|indicator|decorator)(?:$|[\s:_-])/i;

export function toRect(rect: DOMRect): DevPilotRect {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

export function normalizeRect(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): DevPilotRect {
  const left = Math.min(startX, endX);
  const top = Math.min(startY, endY);

  return {
    left,
    top,
    width: Math.abs(endX - startX),
    height: Math.abs(endY - startY),
  };
}

export function rectsIntersect(a: DevPilotRect, b: DevPilotRect): boolean {
  return !(
    a.left + a.width < b.left ||
    b.left + b.width < a.left ||
    a.top + a.height < b.top ||
    b.top + b.height < a.top
  );
}

export function getRectArea(rect: DevPilotRect): number {
  return Math.max(0, rect.width) * Math.max(0, rect.height);
}

export function getRectCenter(rect: DevPilotRect): { x: number; y: number } {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

export function isPointInsideRect(
  point: { x: number; y: number },
  rect: DevPilotRect,
): boolean {
  return (
    point.x >= rect.left &&
    point.x <= rect.left + rect.width &&
    point.y >= rect.top &&
    point.y <= rect.top + rect.height
  );
}

export function getOverlapArea(a: DevPilotRect, b: DevPilotRect): number {
  const overlapX =
    Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  const overlapY =
    Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);

  if (overlapX <= 0 || overlapY <= 0) {
    return 0;
  }

  return overlapX * overlapY;
}

export function isWithinDevPilotTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(target.closest(`[${ROOT_ATTR}]`) || target.closest(`[${HOST_ATTR}]`))
  );
}

export function isWithinDevPilotEvent(event: Event): boolean {
  if (typeof event.composedPath === "function") {
    return event.composedPath().some(
      (node) =>
        node instanceof Element &&
        (node.hasAttribute(ROOT_ATTR) || node.hasAttribute(HOST_ATTR)),
    );
  }

  return isWithinDevPilotTarget(event.target);
}

export function resolveHoverTarget(
  x: number,
  y: number,
  fallback: HTMLElement,
): HTMLElement {
  const elements = document.elementsFromPoint(x, y);

  for (const el of elements) {
    if (!(el instanceof HTMLElement)) {
      continue;
    }
    if (el.closest(`[${ROOT_ATTR}]`) || el.closest(`[${HOST_ATTR}]`)) {
      continue;
    }
    if (el === document.body || el === document.documentElement) {
      continue;
    }

    const rect = el.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) {
      continue;
    }

    // Skip near-viewport-size wrappers; keep looking for inner content
    if (rect.width > window.innerWidth * 0.85 && rect.height > window.innerHeight * 0.5) {
      continue;
    }

    const tagName = el.tagName.toLowerCase();
    if (AREA_PREVIEW_MEANINGFUL_TAGS.has(tagName)) {
      return el;
    }

    const role = el.getAttribute("role");
    if (role && AREA_INTERACTIVE_ROLES.has(role)) {
      return el;
    }

    // A non-inline div/span that has text and no nested meaningful children
    // is likely a leaf content block (card, panel, etc.)
    if ((tagName === "div" || tagName === "span") && !hasNestedAreaContent(el)) {
      const text = getNormalizedElementText(el);
      const computed = window.getComputedStyle(el);
      if (text && computed.display !== "inline") {
        return el;
      }
    }
  }

  // Fallback: if the raw target itself is huge, try to snap to a structured child
  const fallbackRect = fallback.getBoundingClientRect();
  if (
    fallbackRect.width > window.innerWidth * 0.7 ||
    fallbackRect.height > window.innerHeight * 0.5
  ) {
    const children = Array.from(fallback.children).filter(
      (c): c is HTMLElement => c instanceof HTMLElement,
    );
    for (const child of children) {
      const childRect = toRect(child.getBoundingClientRect());
      if (
        childRect.width < 120 ||
        childRect.height < 44 ||
        childRect.width > window.innerWidth * 0.96 ||
        childRect.height > window.innerHeight * 0.82
      ) {
        continue;
      }
      const meaningfulChildren = countMeaningfulAreaChildren(child);
      const descendantCount = child.querySelectorAll(AREA_MATCH_SELECTOR).length;
      if (meaningfulChildren >= 2 || descendantCount >= 2) {
        return child;
      }
    }
  }

  return fallback;
}

function getComputedStyleSnapshot(element: HTMLElement): Record<string, string> {
  if (typeof window === "undefined" || !window.getComputedStyle) {
    return {};
  }
  const computed = window.getComputedStyle(element);
  const keys: string[] = [
    "display",
    "position",
    "color",
    "backgroundColor",
    "fontSize",
    "fontWeight",
    "width",
    "height",
    "margin",
    "padding",
    "borderRadius",
    "zIndex",
  ];
  const snapshot: Record<string, string> = {};
  keys.forEach((key: string) => {
    const value = computed.getPropertyValue(key);
    if (value && value !== "none" && value !== "auto" && value !== "normal") {
      snapshot[key] = value;
    }
  });
  return snapshot;
}

function buildSelectorCandidates(element: HTMLElement): string[] {
  const candidates: string[] = [];
  const tagName = element.tagName.toLowerCase();

  if (element.id) {
    candidates.push(`#${element.id}`);
  }

  const testId = element.getAttribute("data-testid");
  if (testId) {
    candidates.push(`[data-testid="${testId}"]`);
  }

  const qaId = element.getAttribute("data-qa");
  if (qaId) {
    candidates.push(`[data-qa="${qaId}"]`);
  }

  if (element.classList.length > 0) {
    const classes = Array.from(element.classList).filter(
      (c) => !/^(ant-|el-|mui-|chakra-|tw-|bp3-|is-|has-|active|selected|disabled|open)/.test(c),
    );
    if (classes.length > 0) {
      candidates.push(`${tagName}.${classes.slice(0, 3).join(".")}`);
    }
  }

  const role = element.getAttribute("role");
  if (role) {
    candidates.push(`${tagName}[role="${role}"]`);
  }

  const name = element.getAttribute("name");
  if (name) {
    candidates.push(`${tagName}[name="${name}"]`);
  }

  candidates.push(tagName);
  return candidates.slice(0, 6);
}

function getNearbyElements(element: HTMLElement, maxNeighbors = 4): string[] {
  const neighbors: string[] = [];
  const parent = element.parentElement;
  if (parent) {
    const siblings = Array.from(parent.children).filter((child) => child !== element);
    siblings.slice(0, maxNeighbors).forEach((sibling) => {
      if (sibling instanceof HTMLElement) {
        const tag = sibling.tagName.toLowerCase();
        const text = (sibling.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40);
        const role = sibling.getAttribute("role");
        neighbors.push(`${tag}${role ? `(${role})` : ""}${text ? `: ${text}` : ""}`.trim());
      }
    });
  }
  return neighbors;
}

function getDataAttributes(element: HTMLElement): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attributes = element.attributes;
  for (let i = 0; i < attributes.length; i++) {
    const attr = attributes[i];
    if (attr.name.startsWith("data-")) {
      attrs[attr.name] = attr.value;
    }
  }
  return attrs;
}

function getComponentHints(element: HTMLElement): string[] {
  const hints: string[] = [];
  const componentName =
    element.getAttribute("data-component") ||
    element.getAttribute("data-component-name") ||
    element.getAttribute("data-testid");
  if (componentName) {
    hints.push(componentName);
  }

  // Walk up to find React __reactFiber$ keys (lightweight detection)
  let current: HTMLElement | null = element;
  let depth = 0;
  while (current && depth < 6) {
    const keys: string[] = Object.keys(current);
    const fiberKey = keys.find((k: string) => k.startsWith("__reactFiber"));
    if (fiberKey) {
      // @ts-expect-error accessing internal React property
      const fiber = current[fiberKey];
      if (fiber?.elementType?.name) {
        hints.push(fiber.elementType.name);
      }
      if (fiber?.elementType?.displayName) {
        hints.push(fiber.elementType.displayName);
      }
      // Also try to get the parent component name
      if (fiber?.return?.elementType?.name) {
        hints.push(fiber.return.elementType.name);
      }
      break;
    }
    current = current.parentElement;
    depth += 1;
  }

  return Array.from(new Set(hints));
}

function getSourceHints(element: HTMLElement): string[] {
  const hints: string[] = [];

  // Check for source map hints via data attributes (common in dev builds)
  const sourceFile =
    element.getAttribute("data-source") ||
    element.getAttribute("data-source-file") ||
    element.getAttribute("data-file");
  if (sourceFile) {
    hints.push(sourceFile);
  }

  // Try to extract source map info from React fiber
  let current: HTMLElement | null = element;
  let depth = 0;
  while (current && depth < 4) {
    const keys: string[] = Object.keys(current);
    const fiberKey = keys.find((k: string) => k.startsWith("__reactFiber"));
    if (fiberKey) {
      // @ts-expect-error accessing internal React property
      const fiber = current[fiberKey];
      // React DevTools may inject _debugSource
      if (fiber?._debugSource?.fileName) {
        hints.push(fiber._debugSource.fileName);
      }
      break;
    }
    current = current.parentElement;
    depth += 1;
  }

  return hints;
}

export function describeElement(
  element: HTMLElement,
): {
  elementName: string;
  elementPath: string;
  nearbyText?: string;
  context?: import("../types").DevPilotElementContext;
} {
  const tagName = element.tagName.toLowerCase();
  const role = element.getAttribute("role");
  const text = (element.textContent || "").trim().replace(/\s+/g, " ");
  const label = [tagName, role ? `(${role})` : "", text ? ` ${text.slice(0, 36)}` : ""]
    .join("")
    .trim();

  const path = [];
  let current: HTMLElement | null = element;
  let depth = 0;
  while (current && depth < 5) {
    const part = current.tagName.toLowerCase();
    const id = current.id ? `#${current.id}` : "";
    const className =
      current.classList.length > 0
        ? `.${Array.from(current.classList).slice(0, 2).join(".")}`
        : "";

    const parent = current.parentElement;
    let nthChild = "";
    if (parent) {
      const sameTagSiblings = Array.from(parent.children).filter(
        (child) => child.tagName.toLowerCase() === part,
      );
      if (sameTagSiblings.length > 1) {
        const index = Array.from(parent.children).indexOf(current) + 1;
        nthChild = `:nth-child(${index})`;
      }
    }

    path.unshift(`${part}${id}${className}${nthChild}`);
    current = parent;
    depth += 1;
  }

  return {
    elementName: label || tagName,
    elementPath: path.join(" > "),
    nearbyText: text || undefined,
    context: {
      cssClasses: Array.from(element.classList),
      selectorCandidates: buildSelectorCandidates(element),
      nearbyElements: getNearbyElements(element),
      computedStyleSnapshot: getComputedStyleSnapshot(element),
      componentHints: getComponentHints(element),
      sourceHints: getSourceHints(element),
      dataAttributes: getDataAttributes(element),
    },
  };
}

function getNormalizedElementText(element: HTMLElement): string {
  return (element.textContent || "").trim().replace(/\s+/g, " ");
}

function containsRect(outer: DevPilotRect, inner: DevPilotRect): boolean {
  return (
    outer.left <= inner.left &&
    outer.top <= inner.top &&
    outer.left + outer.width >= inner.left + inner.width &&
    outer.top + outer.height >= inner.top + inner.height
  );
}

function buildAreaPreviewPoints(rect: DevPilotRect): Array<[number, number]> {
  const left = rect.left;
  const top = rect.top;
  const right = rect.left + rect.width;
  const bottom = rect.top + rect.height;
  const midX = (left + right) / 2;
  const midY = (top + bottom) / 2;

  return [
    [left, top],
    [right, top],
    [left, bottom],
    [right, bottom],
    [midX, midY],
    [midX, top],
    [midX, bottom],
    [left, midY],
    [right, midY],
  ].map(([x, y]) => [
    Math.max(0, Math.min(window.innerWidth - 1, x)),
    Math.max(0, Math.min(window.innerHeight - 1, y)),
  ]);
}

function isAreaInteractiveLikeElement(element: HTMLElement): boolean {
  const role = element.getAttribute("role");
  const tabIndex = element.getAttribute("tabindex");
  const className =
    typeof element.className === "string" ? element.className : "";

  return (
    Boolean(role && AREA_INTERACTIVE_ROLES.has(role)) ||
    element.onclick !== null ||
    element.hasAttribute("data-clickable") ||
    (tabIndex !== null && tabIndex !== "-1") ||
    /(?:^|[\s:_-])(btn|button|switch|toggle|tab|menu-item|clickable)(?:$|[\s:_-])/i.test(
      className,
    )
  );
}

function isAreaIgnoredFragment(element: HTMLElement): boolean {
  if (
    element.getAttribute("aria-hidden") === "true" ||
    element.getAttribute("role") === "presentation"
  ) {
    return true;
  }

  const className =
    typeof element.className === "string" ? element.className : "";
  if (AREA_FRAGMENT_PATTERN.test(className) || AREA_FRAGMENT_PATTERN.test(element.id || "")) {
    return true;
  }

  const tagName = element.tagName.toLowerCase();
  return ["svg", "path", "i"].includes(tagName) && !getNormalizedElementText(element);
}

function hasNestedAreaContent(element: HTMLElement): boolean {
  return Boolean(element.querySelector(AREA_NESTED_CONTENT_SELECTOR));
}

function countMeaningfulAreaChildren(element: HTMLElement): number {
  return Array.from(element.children).filter((child) => {
    if (!(child instanceof HTMLElement)) {
      return false;
    }

    const tagName = child.tagName.toLowerCase();
    const text = getNormalizedElementText(child);
    return (
      AREA_PREVIEW_MEANINGFUL_TAGS.has(tagName) ||
      Boolean(text) ||
      Boolean(child.querySelector(AREA_MATCH_SELECTOR)) ||
      isAreaInteractiveLikeElement(child)
    );
  }).length;
}

function isAreaStructuredContainer(
  element: HTMLElement,
  elementRect: DevPilotRect,
  selectionRect: DevPilotRect,
): boolean {
  const tagName = element.tagName.toLowerCase();

  if (!["div", "section", "article", "aside", "nav", "form"].includes(tagName)) {
    return false;
  }

  if (elementRect.width < 120 || elementRect.height < 44) {
    return false;
  }

  if (
    elementRect.width > window.innerWidth * 0.96 ||
    elementRect.height > window.innerHeight * 0.82
  ) {
    return false;
  }

  if (getRectArea(elementRect) >= getRectArea(selectionRect) * 0.98) {
    return false;
  }

  const meaningfulChildren = countMeaningfulAreaChildren(element);
  const descendantCount = element.querySelectorAll(AREA_MATCH_SELECTOR).length;
  const hasTableLikeDescendant = Boolean(
    element.querySelector("table, thead, tbody, tr"),
  );

  return meaningfulChildren >= 2 && (descendantCount >= 2 || hasTableLikeDescendant);
}

function shouldIncludeAreaPreviewElement(
  element: HTMLElement,
  elementRect: DevPilotRect,
  selectionRect: DevPilotRect,
): boolean {
  if (isAreaIgnoredFragment(element)) {
    return false;
  }

  const tagName = element.tagName.toLowerCase();
  const text = getNormalizedElementText(element);
  const isInteractive = isAreaInteractiveLikeElement(element);

  if (AREA_PREVIEW_MEANINGFUL_TAGS.has(tagName)) {
    return true;
  }

  if (tagName === "div" || tagName === "span") {
    if ((Boolean(text) || isInteractive) && !hasNestedAreaContent(element)) {
      return true;
    }

    return isAreaStructuredContainer(element, elementRect, selectionRect);
  }

  return isAreaStructuredContainer(element, elementRect, selectionRect);
}

function shouldIncludeCommittedAreaElement(element: HTMLElement): boolean {
  if (isAreaIgnoredFragment(element)) {
    return false;
  }

  const tagName = element.tagName.toLowerCase();
  const role = element.getAttribute("role");

  if (AREA_SEMANTIC_TAGS.has(tagName) || (role && AREA_INTERACTIVE_ROLES.has(role))) {
    return true;
  }

  if (tagName === "div" || tagName === "span") {
    // Interactive leaf elements
    if (isAreaInteractiveLikeElement(element) && !hasNestedAreaContent(element)) {
      return true;
    }
    // Text-only leaf containers (common in utility-first CSS frameworks)
    const text = getNormalizedElementText(element);
    if (text && !hasNestedAreaContent(element)) {
      return true;
    }
  }

  return false;
}

export function collectAreaPreviewRects(rect: DevPilotRect): DevPilotRect[] {
  const candidateElements = new Set<HTMLElement>();
  const samplePoints = buildAreaPreviewPoints(rect);

  samplePoints.forEach(([x, y]) => {
    document.elementsFromPoint(x, y).forEach((element) => {
      if (element instanceof HTMLElement) {
        candidateElements.add(element);
      }
    });
  });

  document.querySelectorAll<HTMLElement>(AREA_PREVIEW_SELECTOR).forEach((element) => {
    const elementRect = toRect(element.getBoundingClientRect());
    const center = getRectCenter(elementRect);
    const overlapArea = getOverlapArea(rect, elementRect);
    const overlapRatio = overlapArea / Math.max(1, getRectArea(elementRect));

    if (isPointInsideRect(center, rect) || overlapRatio > 0.5) {
      candidateElements.add(element);
    }
  });

  const allMatching: DevPilotRect[] = [];
  const sortedCandidates = Array.from(candidateElements).sort((a, b) => {
    const aRect = toRect(a.getBoundingClientRect());
    const bRect = toRect(b.getBoundingClientRect());
    return getRectArea(bRect) - getRectArea(aRect);
  });

  sortedCandidates.forEach((element) => {
    if (element.closest(`[${ROOT_ATTR}]`) || element.closest(`[${HOST_ATTR}]`)) {
      return;
    }

    const elementRect = toRect(element.getBoundingClientRect());
    if (
      elementRect.width > window.innerWidth * 0.8 &&
      elementRect.height > window.innerHeight * 0.5
    ) {
      return;
    }
    if (elementRect.width < 10 || elementRect.height < 10) {
      return;
    }
    if (!rectsIntersect(rect, elementRect)) {
      return;
    }
    if (!shouldIncludeAreaPreviewElement(element, elementRect, rect)) {
      return;
    }

    const dominated = allMatching.some((existingRect) =>
      containsRect(existingRect, elementRect),
    );

    if (!dominated) {
      allMatching.push(elementRect);
    }
  });

  return allMatching.sort((a, b) => {
    if (Math.abs(a.top - b.top) > 8) {
      return a.top - b.top;
    }

    if (Math.abs(a.left - b.left) > 8) {
      return a.left - b.left;
    }

    return getRectArea(a) - getRectArea(b);
  });
}

export function collectAreaMatches(
  rect: DevPilotRect,
): Array<{ element: HTMLElement; rect: DevPilotRect }> {
  const allMatching: Array<{ element: HTMLElement; rect: DevPilotRect }> = [];
  const selector = `${AREA_MATCH_SELECTOR}, div, span`;

  document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
    if (element.closest(`[${ROOT_ATTR}]`) || element.closest(`[${HOST_ATTR}]`)) {
      return;
    }

    const elementRect = toRect(element.getBoundingClientRect());
    if (
      elementRect.width > window.innerWidth * 0.8 &&
      elementRect.height > window.innerHeight * 0.5
    ) {
      return;
    }
    if (elementRect.width < 10 || elementRect.height < 10) {
      return;
    }
    if (!rectsIntersect(rect, elementRect)) {
      return;
    }
    if (!shouldIncludeCommittedAreaElement(element)) {
      return;
    }

    allMatching.push({ element, rect: elementRect });
  });

  return allMatching
    .filter(
      ({ element }) =>
        !allMatching.some(
          ({ element: other }) => other !== element && element.contains(other),
        ),
    )
    .sort((a, b) => {
      if (Math.abs(a.rect.top - b.rect.top) > 8) {
        return a.rect.top - b.rect.top;
      }

      if (Math.abs(a.rect.left - b.rect.left) > 8) {
        return a.rect.left - b.rect.left;
      }

      return getRectArea(a.rect) - getRectArea(b.rect);
    });
}

function getUnionRect(rects: DevPilotRect[]): DevPilotRect | null {
  if (rects.length === 0) {
    return null;
  }

  const left = Math.min(...rects.map((item) => item.left));
  const top = Math.min(...rects.map((item) => item.top));
  const right = Math.max(...rects.map((item) => item.left + item.width));
  const bottom = Math.max(...rects.map((item) => item.top + item.height));

  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  };
}

export function describeAreaDraftPreview(rect: DevPilotRect): {
  matchRects: DevPilotRect[];
  matchCount: number;
} {
  const matchRects = collectAreaPreviewRects(rect);

  return {
    matchRects,
    matchCount: matchRects.length,
  };
}

export function describeCommittedAreaSelection(rect: DevPilotRect): {
  rect: DevPilotRect;
  elementName: string;
  elementPath: string;
  nearbyText?: string;
  relatedElements?: string[];
  matchRects: DevPilotRect[];
  matchCount: number;
  context?: import("../types").DevPilotElementContext;
} {
  const matches = collectAreaMatches(rect);
  const snappedRect = getUnionRect(matches.map((item) => item.rect)) || rect;

  const relatedElements = Array.from(
    new Set(
      matches
        .map(({ element }) => describeElement(element).elementName)
        .filter(Boolean),
    ),
  ).slice(0, 6);

  const kindCounter = new Map<string, number>();
  matches.forEach(({ element }) => {
    const tagName = element.tagName.toLowerCase();
    const role = element.getAttribute("role");
    const token = role ? `${tagName}(${role})` : tagName;
    kindCounter.set(token, (kindCounter.get(token) || 0) + 1);
  });

  const groupedKinds = Array.from(kindCounter.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([token, count]) => `${token} ×${count}`);

  const nearbyText = Array.from(
    new Set(
      matches
        .map(({ element }) =>
          (element.textContent || "").trim().replace(/\s+/g, " "),
        )
        .filter((value) => value.length > 0),
    ),
  )
    .slice(0, 3)
    .join(" · ");

  // Merge context from all matched elements
  const allCssClasses = new Set<string>();
  const allSelectors = new Set<string>();
  const allNearby = new Set<string>();
  const allComponents = new Set<string>();
  const allSources = new Set<string>();
  const styleSnapshot: Record<string, string> = {};
  const dataAttributes: Record<string, string> = {};

  matches.forEach(({ element }) => {
    const desc = describeElement(element);
    if (desc.context) {
      desc.context.cssClasses?.forEach((c) => allCssClasses.add(c));
      desc.context.selectorCandidates?.forEach((s) => allSelectors.add(s));
      desc.context.nearbyElements?.forEach((n) => allNearby.add(n));
      desc.context.componentHints?.forEach((h) => allComponents.add(h));
      desc.context.sourceHints?.forEach((h) => allSources.add(h));
      if (desc.context.computedStyleSnapshot) {
        Object.assign(styleSnapshot, desc.context.computedStyleSnapshot);
      }
      if (desc.context.dataAttributes) {
        Object.assign(dataAttributes, desc.context.dataAttributes);
      }
    }
  });

  const context: import("../types").DevPilotElementContext | undefined =
    matches.length > 0
      ? {
          cssClasses: Array.from(allCssClasses).slice(0, 12),
          selectorCandidates: Array.from(allSelectors).slice(0, 8),
          nearbyElements: Array.from(allNearby).slice(0, 6),
          computedStyleSnapshot: Object.keys(styleSnapshot).length > 0 ? styleSnapshot : undefined,
          componentHints: Array.from(allComponents).slice(0, 4),
          sourceHints: Array.from(allSources).slice(0, 4),
          dataAttributes: Object.keys(dataAttributes).length > 0 ? dataAttributes : undefined,
        }
      : undefined;

  return {
    rect: snappedRect,
    elementName:
      matches.length > 0 ? `区域标注 · ${matches.length} 个元素` : "区域标注",
    elementPath:
      groupedKinds.length > 0
        ? groupedKinds.join(" · ")
        : `区域 ${Math.round(snappedRect.width)}×${Math.round(snappedRect.height)}`,
    nearbyText: nearbyText || undefined,
    relatedElements,
    matchRects: matches.map((item) => item.rect),
    matchCount: matches.length,
    context,
  };
}
