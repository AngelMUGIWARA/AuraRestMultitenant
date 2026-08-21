const PRINT_FRAME_ID = 'cashier-ticket-print-frame';
// Safety net only — cleans up the iframe if `afterprint` never fires for any
// reason. Does not gate or delay the print itself (that's driven by the
// iframe's `load` event below), so it never risks printing stale/empty
// content the way a setTimeout-before-print would.
const CLEANUP_FALLBACK_MS = 60_000;

function removeExistingPrintFrame(): void {
  const existing = document.getElementById(PRINT_FRAME_ID);
  existing?.parentNode?.removeChild(existing);
}

/**
 * Prints an HTML document fully isolated from the host page (web-shell +
 * the rest of the POS): the document is loaded into a hidden iframe with
 * its own window, and only that iframe's content is sent to print(). The
 * host DOM is never touched, so nothing outside the ticket can ever end up
 * on the printed page or in the print preview.
 */
export function printHtmlDocument(html: string): void {
  removeExistingPrintFrame();

  const iframe = document.createElement('iframe');
  iframe.id = PRINT_FRAME_ID;
  iframe.setAttribute('aria-hidden', 'true');
  // Off-screen with real dimensions, not visibility:hidden / 0x0 — Chrome's
  // print pipeline has documented inconsistencies rendering hidden or
  // zero-sized iframes, sometimes producing a blank page/PDF even though
  // the document loaded correctly. Positioning it off-screen keeps it out
  // of view without hiding it from layout/paint.
  iframe.style.position = 'fixed';
  iframe.style.top = '0';
  iframe.style.left = '-10000px';
  iframe.style.width = '80mm';
  iframe.style.height = '100vh';
  iframe.style.border = '0';

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    window.removeEventListener('afterprint', cleanup);
    iframe.parentNode?.removeChild(iframe);
  };

  iframe.addEventListener(
    'load',
    () => {
      const frameWindow = iframe.contentWindow;
      if (!frameWindow) {
        cleanup();
        return;
      }
      // `afterprint` on the top-level window (not the iframe's own
      // contentWindow) — more consistently reported across browsers for a
      // print triggered from within an iframe.
      window.addEventListener('afterprint', cleanup, { once: true });
      setTimeout(cleanup, CLEANUP_FALLBACK_MS);

      frameWindow.focus();
      frameWindow.print();
    },
    { once: true },
  );

  // `srcdoc` is set BEFORE the iframe is inserted into the document. If
  // inserted first and set afterward, the browser can navigate the iframe
  // to `about:blank` on insertion and fire its own `load` event for that
  // empty document — which the `{ once: true }` listener above would
  // consume before the real ticket content ever loads, printing a blank
  // page. Setting `srcdoc` first means there's a single navigation,
  // straight to the ticket content.
  iframe.srcdoc = html;
  document.body.appendChild(iframe);
}
