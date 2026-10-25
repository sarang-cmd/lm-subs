/**
 * Optical screening-aperture brand mark for LM Subs (`src/ui/brand-icon.js`).
 * Graphite squircle (#111315), inner 16:9 cinema viewport (#181C22),
 * Alabaster play wedge (#F6F7F8), and Optical Cobalt (#3B82F6) + Alabaster caption bars.
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

  const rim = doc.createElementNS(SVG_NS, "rect");
  rim.setAttribute("x", "2");
  rim.setAttribute("y", "2");
  rim.setAttribute("width", "124");
  rim.setAttribute("height", "124");
  rim.setAttribute("rx", "26");
  rim.setAttribute("stroke", "#262B35");
  rim.setAttribute("stroke-width", "2");

  const screen = doc.createElementNS(SVG_NS, "rect");
  screen.setAttribute("x", "18");
  screen.setAttribute("y", "22");
  screen.setAttribute("width", "92");
  screen.setAttribute("height", "84");
  screen.setAttribute("rx", "14");
  screen.setAttribute("fill", "#181C22");
  screen.setAttribute("stroke", "#363D4A");
  screen.setAttribute("stroke-width", "2");

  const play = doc.createElementNS(SVG_NS, "path");
  play.setAttribute(
    "d",
    "M52 39.5C52 37.9 53.75 36.92 55.12 37.75L77.4 51.25C78.72 52.05 78.72 53.95 77.4 54.75L55.12 68.25C53.75 69.08 52 68.1 52 66.5V39.5Z"
  );
  play.setAttribute("fill", "#F6F7F8");

  const cuePrimary = doc.createElementNS(SVG_NS, "rect");
  cuePrimary.setAttribute("x", "28");
  cuePrimary.setAttribute("y", "82");
  cuePrimary.setAttribute("width", "44");
  cuePrimary.setAttribute("height", "10");
  cuePrimary.setAttribute("rx", "5");
  cuePrimary.setAttribute("fill", "#3B82F6");

  const cueSecondary = doc.createElementNS(SVG_NS, "rect");
  cueSecondary.setAttribute("x", "78");
  cueSecondary.setAttribute("y", "82");
  cueSecondary.setAttribute("width", "22");
  cueSecondary.setAttribute("height", "10");
  cueSecondary.setAttribute("rx", "5");
  cueSecondary.setAttribute("fill", "#F6F7F8");

  svg.append(bg, rim, screen, play, cuePrimary, cueSecondary);
  return svg;
}
