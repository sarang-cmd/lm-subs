/**
 * One product screenshot (`src/web/ProductShot.jsx`).
 *
 * Every image in `docs/assets/screenshots/` ships twice: a WebP that browsers
 * load first and a PNG fallback for engines without WebP support. Both share
 * the same base path, so callers pass `src` without an extension.
 *
 * `?v=10` busts the CDN cache whenever the captures are re-taken.
 */

const SHOT_VERSION = "10";

export function ProductShot({
  src,
  alt,
  width = 1280,
  height = 800,
  eager = false,
}) {
  return (
    <picture>
      <source
        srcSet={`${src}.webp?v=${SHOT_VERSION}`}
        type="image/webp"
      />
      <img
        src={`${src}.png?v=${SHOT_VERSION}`}
        alt={alt}
        width={width}
        height={height}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
      />
    </picture>
  );
}
