/**
 * Canonical LM Subs Brand Mark (`src/lib/brand-logo.js`).
 *
 * Renders the genuine LM Subs squircle logo (folded perspective notebook page,
 * three vertical acoustic soundwave bars, and Optical Cobalt right caption
 * bracket) via Trusted-Types-safe DOM APIs (`createElementNS`) or a self-contained
 * data URI fallback for OS notifications.
 */

const SVG_NS = "http://www.w3.org/2000/svg";

export const LM_SUBS_LOGO_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" fill="none">' +
  '<rect width="128" height="128" rx="28" fill="#111315"/>' +
  '<path fill-rule="evenodd" clip-rule="evenodd" d="M45.8 21.5C48.2 20.4 51 22.2 51 24.9V103.5C51 106.5 47.5 108.2 45.1 106.4L22.6 89.2C20.1 87.3 18.6 84.3 18.6 81.1V41.6C18.6 37.3 21.1 33.4 25 31.6L45.8 21.5ZM24.5 81.8L42.6 95.6C43.7 96.4 45.2 95.6 45.2 94.3V83.1C45.2 81.7 44 80.5 42.6 80.5H25.1C23.8 80.5 23.4 81 24.5 81.8Z" fill="#F6F7F8"/>' +
  '<rect x="56.5" y="49.5" width="8" height="29" rx="4" fill="#F6F7F8"/>' +
  '<rect x="68.5" y="37" width="8.5" height="54" rx="4.25" fill="#F6F7F8"/>' +
  '<rect x="81" y="49.5" width="8" height="29" rx="4" fill="#F6F7F8"/>' +
  '<path d="M84.5 27H98.5C104.851 27 110 32.1487 110 38.5V89.5C110 95.8513 104.851 101 98.5 101H84.5C81.7386 101 79.5 98.7614 79.5 96C79.5 93.2386 81.7386 91 84.5 91H97C98.3807 91 99.5 89.8807 99.5 88.5V39.5C99.5 38.1193 98.3807 37 97 37H84.5C81.7386 37 79.5 34.7614 79.5 32C79.5 29.2386 81.7386 27 84.5 27Z" fill="#1D5CF6"/>' +
  "</svg>";

export const LM_SUBS_LOGO_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(
  LM_SUBS_LOGO_SVG
)}`;

export function resolveExtensionLogoUrl(
  runtime = globalThis.chrome?.runtime,
  size = 128
) {
  const validSize = [16, 32, 48, 128].includes(Number(size)) ? Number(size) : 128;
  const relPath = `icons/icon${validSize}.png`;
  try {
    if (runtime?.getURL) {
      const resolved = runtime.getURL(relPath);
      if (resolved) return resolved;
    }
  } catch {
    // Fall back to relative icon path or data URI
  }
  return relPath;
}

/**
 * Builds the LM Subs squircle vector mark without touching `innerHTML`
 * (safe under Google NotebookLM's Trusted Types policy).
 */
export function createBrandLogoElement(
  doc = globalThis.document,
  { size = 24, className = "brand-logo" } = {}
) {
  if (doc && typeof doc.createElementNS === "function") {
    const svg = doc.createElementNS(SVG_NS, "svg");
    svg.setAttribute("width", String(size));
    svg.setAttribute("height", String(size));
    svg.setAttribute("viewBox", "0 0 128 128");
    svg.setAttribute("fill", "none");
    svg.setAttribute("aria-hidden", "true");
    if (className) svg.setAttribute("class", className);

    const bg = doc.createElementNS(SVG_NS, "rect");
    bg.setAttribute("x", "2");
    bg.setAttribute("y", "2");
    bg.setAttribute("width", "124");
    bg.setAttribute("height", "124");
    bg.setAttribute("rx", "27");
    bg.setAttribute("fill", "#111315");
    bg.setAttribute("stroke", "#272B33");
    bg.setAttribute("stroke-width", "4");

    const page = doc.createElementNS(SVG_NS, "path");
    page.setAttribute("fill-rule", "evenodd");
    page.setAttribute("clip-rule", "evenodd");
    page.setAttribute(
      "d",
      "M45.8 21.5C48.2 20.4 51 22.2 51 24.9V103.5C51 106.5 47.5 108.2 45.1 106.4L22.6 89.2C20.1 87.3 18.6 84.3 18.6 81.1V41.6C18.6 37.3 21.1 33.4 25 31.6L45.8 21.5ZM24.5 81.8L42.6 95.6C43.7 96.4 45.2 95.6 45.2 94.3V83.1C45.2 81.7 44 80.5 42.6 80.5H25.1C23.8 80.5 23.4 81 24.5 81.8Z"
    );
    page.setAttribute("fill", "#F6F7F8");

    const bar1 = doc.createElementNS(SVG_NS, "rect");
    bar1.setAttribute("x", "56.5");
    bar1.setAttribute("y", "49.5");
    bar1.setAttribute("width", "8");
    bar1.setAttribute("height", "29");
    bar1.setAttribute("rx", "4");
    bar1.setAttribute("fill", "#F6F7F8");

    const bar2 = doc.createElementNS(SVG_NS, "rect");
    bar2.setAttribute("x", "68.5");
    bar2.setAttribute("y", "37");
    bar2.setAttribute("width", "8.5");
    bar2.setAttribute("height", "54");
    bar2.setAttribute("rx", "4.25");
    bar2.setAttribute("fill", "#F6F7F8");

    const bar3 = doc.createElementNS(SVG_NS, "rect");
    bar3.setAttribute("x", "81");
    bar3.setAttribute("y", "49.5");
    bar3.setAttribute("width", "8");
    bar3.setAttribute("height", "29");
    bar3.setAttribute("rx", "4");
    bar3.setAttribute("fill", "#F6F7F8");

    const bracket = doc.createElementNS(SVG_NS, "path");
    bracket.setAttribute(
      "d",
      "M84.5 27H98.5C104.851 27 110 32.1487 110 38.5V89.5C110 95.8513 104.851 101 98.5 101H84.5C81.7386 101 79.5 98.7614 79.5 96C79.5 93.2386 81.7386 91 84.5 91H97C98.3807 91 99.5 89.8807 99.5 88.5V39.5C99.5 38.1193 98.3807 37 97 37H84.5C81.7386 37 79.5 34.7614 79.5 32C79.5 29.2386 81.7386 27 84.5 27Z"
    );
    bracket.setAttribute("fill", "#1D5CF6");

    svg.append(bg, page, bar1, bar2, bar3, bracket);
    return svg;
  }

  const img = doc.createElement("img");
  img.src = LM_SUBS_LOGO_DATA_URI;
  img.width = size;
  img.height = size;
  img.alt = "";
  if (className) img.className = className;
  return img;
}
