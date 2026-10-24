/**
 * Clean geometric brand mark for Subtitles for NotebookLM (`src/ui/brand-icon.js`).
 * Utilitarian broadcast/caption aesthetic — no gradients or AI sparkles.
 */

const SVG_NS = "http://www.w3.org/2000/svg";

export function createBrandMarkSvg(doc = globalThis.document, size = 28) {
  const svg = doc.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("viewBox", "0 0 32 32");
  svg.setAttribute("fill", "none");
  svg.setAttribute("aria-hidden", "true");

  const bg = doc.createElementNS(SVG_NS, "rect");
  bg.setAttribute("width", "32");
  bg.setAttribute("height", "32");
  bg.setAttribute("rx", "7");
  bg.setAttribute("fill", "#14171A");

  const border = doc.createElementNS(SVG_NS, "rect");
  border.setAttribute("x", "0.5");
  border.setAttribute("y", "0.5");
  border.setAttribute("width", "31");
  border.setAttribute("height", "31");
  border.setAttribute("rx", "6.5");
  border.setAttribute("stroke", "#2C323B");

  // Play wedge in upper frame
  const play = doc.createElementNS(SVG_NS, "path");
  play.setAttribute("d", "M13 8.5L20.5 13L13 17.5V8.5Z");
  play.setAttribute("fill", "#F4F4F0");

  // Two crisp synchronized subtitle bars along bottom frame
  const bar1 = doc.createElementNS(SVG_NS, "rect");
  bar1.setAttribute("x", "6");
  bar1.setAttribute("y", "21");
  bar1.setAttribute("width", "12");
  bar1.setAttribute("height", "2.5");
  bar1.setAttribute("rx", "1.25");
  bar1.setAttribute("fill", "#22C55E");

  const bar2 = doc.createElementNS(SVG_NS, "rect");
  bar2.setAttribute("x", "20");
  bar2.setAttribute("y", "21");
  bar2.setAttribute("width", "6");
  bar2.setAttribute("height", "2.5");
  bar2.setAttribute("rx", "1.25");
  bar2.setAttribute("fill", "#F4F4F0");

  const bar3 = doc.createElementNS(SVG_NS, "rect");
  bar3.setAttribute("x", "8.5");
  bar3.setAttribute("y", "25");
  bar3.setAttribute("width", "15");
  bar3.setAttribute("height", "2.2");
  bar3.setAttribute("rx", "1.1");
  bar3.setAttribute("fill", "#9CA3AF");

  svg.append(bg, border, play, bar1, bar2, bar3);
  return svg;
}
