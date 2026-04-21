/**
 * Client-side live preview bridge.
 *
 * When the page is embedded in an iframe by the Payload admin's Live Preview
 * panel, we:
 *   1. Call `ready()` so the admin knows to start posting form-state events.
 *   2. On each live-preview event, debounce and POST the doc data back to
 *      the current preview URL.
 *   3. The preview route, receiving POST, uses the injected doc data in
 *      place of fetching from the CMS, renders fresh HTML, and returns it.
 *   4. We swap `document.body.innerHTML` with the response body — same
 *      render path as the initial SSR load, so nothing drifts.
 *
 * Include via `<script>import "../../scripts/live-preview";</script>` on any
 * preview page.
 */
import { ready, isLivePreviewEvent } from "@payloadcms/live-preview";

const serverURL = (
  import.meta.env.PUBLIC_CMS_URL || "http://localhost:3000"
).replace(/\/+$/, "");

if (window.parent !== window) {
  ready({ serverURL });

  let debounceTimer: ReturnType<typeof setTimeout>;

  window.addEventListener("message", (event) => {
    if (isLivePreviewEvent(event, serverURL)) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        try {
          const res = await fetch(window.location.href, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(event.data.data),
          });
          const html = await res.text();
          const parser = new DOMParser();
          const newDoc = parser.parseFromString(html, "text/html");
          document.title = newDoc.title;
          document.body.innerHTML = newDoc.body.innerHTML;
        } catch (e) {
          console.error(
            "[LivePreview] render failed, falling back to reload:",
            e,
          );
          window.location.reload();
        }
      }, 300);
    }
  });
}
