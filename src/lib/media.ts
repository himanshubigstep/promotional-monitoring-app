// Single shared "no image available" placeholder, used everywhere a
// product/promotion has no real image_url/screenshotUrl (or its URL 404s).
// Previously this was a real stock photo of an actual product, copy-pasted
// independently into 8 different files — since any number of unrelated
// items with no real image all rendered that same photo, it read as
// duplicate/broken data to anyone browsing the app even though it was just
// a display fallback. An inline SVG "no image" icon reads unambiguously as
// "nothing to show" instead of looking like a real (repeated) product photo,
// and having one shared constant means a future change is a one-line edit
// instead of eight.
export const noImagePlaceholder =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="#f5f7fa"/>
  <g fill="none" stroke="#cbd0dd" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">
    <rect x="60" y="90" width="280" height="220" rx="16"/>
    <circle cx="150" cy="160" r="24"/>
    <path d="M60 270l80-80 60 60 60-50 80 80"/>
  </g>
</svg>`.trim());
