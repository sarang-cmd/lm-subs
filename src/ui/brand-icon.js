/**
 * Brand mark for LM Subs (`src/ui/brand-icon.js`).
 * Graphite squircle (#111315) with perspective folded notebook page (#F6F7F8),
 * three vertical acoustic soundwave bars (#F6F7F8), and Optical Cobalt (#1D5CF6) caption bracket.
 */

const SVG_NS = "http://www.w3.org/2000/svg";

export function createBrandMarkSvg(doc = globalThis.document, size = 28) {
  const svg = doc.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("viewBox", "0 0 128 128");
  svg.setAttribute("fill", "none");
  svg.setAttribute("aria-hidden", "true");

  const bg = doc.createElementNS(SVG_NS, "rect");
  bg.setAttribute("width", "128");
  bg.setAttribute("height", "128");
  bg.setAttribute("rx", "28");
  bg.setAttribute("fill", "#111315");

  const page = doc.createElementNS(SVG_NS, "path");
  page.setAttribute("fill-rule", "evenodd");
  page.setAttribute("clip-rule", "evenodd");
  page.setAttribute(
    "d",
    "M45.8 21.5C48.2 20.4 51 22.2 51 24.9V103.5C51 106.5 47.5 108.2 45.1 106.4L22.6 89.2C20.1 87.3 18.6 84.3 18.6 81.1V41.6C18.6 37.3 21.1 33.4 25 31.6L45.8 21.5ZM24.5 81.8L42.6 95.6C43.7 96.4 45.2 95.6 45.2 94.3V83.1C45.2 81.7 44 80.5 42.6 80.5H25.1C23.8 80.5 23.4 81 24.5 81.8Z"
  );
  page.setAttribute("fill", "#F6F7F8");

  const barLeft = doc.createElementNS(SVG_NS, "rect");
  barLeft.setAttribute("x", "56.5");
  barLeft.setAttribute("y", "49.5");
  barLeft.setAttribute("width", "8");
  barLeft.setAttribute("height", "29");
  barLeft.setAttribute("rx", "4");
  barLeft.setAttribute("fill", "#F6F7F8");

  const barMid = doc.createElementNS(SVG_NS, "rect");
  barMid.setAttribute("x", "68.5");
  barMid.setAttribute("y", "37");
  barMid.setAttribute("width", "8.5");
  barMid.setAttribute("height", "54");
  barMid.setAttribute("rx", "4.25");
  barMid.setAttribute("fill", "#F6F7F8");

  const barRight = doc.createElementNS(SVG_NS, "rect");
  barRight.setAttribute("x", "81");
  barRight.setAttribute("y", "49.5");
  barRight.setAttribute("width", "8");
  barRight.setAttribute("height", "29");
  barRight.setAttribute("rx", "4");
  barRight.setAttribute("fill", "#F6F7F8");

  const bracket = doc.createElementNS(SVG_NS, "path");
  bracket.setAttribute(
    "d",
    "M84.5 27H98.5C104.851 27 110 32.1487 110 38.5V89.5C110 95.8513 104.851 101 98.5 101H84.5C81.7386 101 79.5 98.7614 79.5 96C79.5 93.2386 81.7386 91 84.5 91H97C98.3807 91 99.5 89.8807 99.5 88.5V39.5C99.5 38.1193 98.3807 37 97 37H84.5C81.7386 37 79.5 34.7614 79.5 32C79.5 29.2386 81.7386 27 84.5 27Z"
  );
  bracket.setAttribute("fill", "#1D5CF6");

  svg.append(bg, page, barLeft, barMid, barRight, bracket);
  return svg;
}
