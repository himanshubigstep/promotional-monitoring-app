// Shared "no image available" placeholders, used everywhere a
// product/promotion has no real image_url/screenshotUrl (or its URL 404s).
// Cycled in a fixed repeating order (not random) from the real placeholder
// images in public/ (served at the app root by CRA), instead of one fixed
// inline SVG, so a full page of missing-image items doesn't all render the
// exact same icon. Having one shared list means a future change (adding
// more images, swapping these ones out) is a one-line edit instead of eight.
const NO_IMAGE_PLACEHOLDERS = ["/discount.png", "/discount2.png", "/discount3.png", "/discount4.png", "/discount5.png"];

let nextPlaceholderIndex = 0;

// Call this once per fallback image needed (not a plain constant) so each
// one advances to the next picture in the list, wrapping back to the start
// after the last - a round-robin loop rather than a single fixed value.
export function getNoImagePlaceholder(): string {
  const image = NO_IMAGE_PLACEHOLDERS[nextPlaceholderIndex % NO_IMAGE_PLACEHOLDERS.length];
  nextPlaceholderIndex += 1;
  return image;
}
