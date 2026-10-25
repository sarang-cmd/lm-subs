/**
 * Geometric screening-aperture brand mark for LM Subs (`src/ui/brand-icon.js`).
 * Graphite frame (#111315), crisp play wedge, and optical Cobalt (#3B82F6 / #0055D4) active caption bar.
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
  bg.setAttribute("fill", "#111315");

  const border = doc.createElementNS(SVG_NS, "rect");
  border.setAttribute("x", "0.5");
  border.setAttribute("y", "0.5");
  border.setAttribute("width", "31");
  border.setAttribute("height", "31");
  border.setAttribute("rx", "6.5");
  border.setAttribute("stroke", "#2A2E35");

  const play = doc.createElementNS(SVG_NS, "path");
  play.setAttribute("d", "M12.5 8.2L20.5 12.8L12.5 17.4V8.2Z");
  play.setAttribute("fill", "#F6F7F8");

  const bar1 = doc.createElementNS(SVG_NS, "rect");
  bar1.setAttribute("x", "6");
  bar1.setAttribute("y", "21.5");
  bar1.setAttribute("width", "12");
  bar1.setAttribute("height", "2.4");
  bar1.setAttribute("rx", "1.2");
  bar1.setAttribute("fill", "#3B82F6");

  const bar2 = doc.createElementNS(SVG_NS, "rect");
  bar2.setAttribute("x", "20");
  bar2.setAttribute("y", "21.5");
  bar2.setAttribute("width", "6");
  bar2.setAttribute("height", "2.4");
  bar2.setAttribute("rx", "1.2");
  bar2.setAttribute("fill", "#F6F7F8");

  const bar3 = doc.createElementNS(SVG_NS, "rect");
  bar3.setAttribute("x", "6");
  bar3.setAttribute("y", "25.4");
  bar3.setAttribute("width", "15");
  bar3.setAttribute("height", "2");
  bar3.setAttribute("rx", "1");
  bar3.setAttribute("fill", "#767D89");

  svg.append(bg, border, play, bar1, bar2, bar3);
  return svg;
}
