/**
 * Geometric broadcast instrument mark for LM Subs (`src/ui/brand-icon.js`).
 * Calibrated to Dieter Rams / Braun industrial geometry: matte charcoal chassis,
 * crisp 4px corner radius, white play aperture, and Signal Orange (#E96A26) cue rule.
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
  bg.setAttribute("rx", "4");
  bg.setAttribute("fill", "#161615");

  const border = doc.createElementNS(SVG_NS, "rect");
  border.setAttribute("x", "0.5");
  border.setAttribute("y", "0.5");
  border.setAttribute("width", "31");
  border.setAttribute("height", "31");
  border.setAttribute("rx", "3.5");
  border.setAttribute("stroke", "#2E2D2A");

  // Precision play wedge in upper monitor aperture
  const play = doc.createElementNS(SVG_NS, "path");
  play.setAttribute("d", "M12.5 8L20.5 12.75L12.5 17.5V8Z");
  play.setAttribute("fill", "#F4F2ED");

  // Synchronized timecode / subtitle rules (Braun Signal Orange active cue)
  const bar1 = doc.createElementNS(SVG_NS, "rect");
  bar1.setAttribute("x", "5.5");
  bar1.setAttribute("y", "21.5");
  bar1.setAttribute("width", "12.5");
  bar1.setAttribute("height", "2.5");
  bar1.setAttribute("rx", "0.75");
  bar1.setAttribute("fill", "#E96A26");

  const bar2 = doc.createElementNS(SVG_NS, "rect");
  bar2.setAttribute("x", "20");
  bar2.setAttribute("y", "21.5");
  bar2.setAttribute("width", "6.5");
  bar2.setAttribute("height", "2.5");
  bar2.setAttribute("rx", "0.75");
  bar2.setAttribute("fill", "#F4F2ED");

  const bar3 = doc.createElementNS(SVG_NS, "rect");
  bar3.setAttribute("x", "5.5");
  bar3.setAttribute("y", "25.5");
  bar3.setAttribute("width", "16");
  bar3.setAttribute("height", "2");
  bar3.setAttribute("rx", "0.75");
  bar3.setAttribute("fill", "#8C8980");

  svg.append(bg, border, play, bar1, bar2, bar3);
  return svg;
}
