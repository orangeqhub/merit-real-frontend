import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

function sanitizeFileName(name) {
  return String(name || 'document')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'document';
}

/** Avoid shorthand props (background/border/font) — browsers may still return oklch(). */
const STYLE_PROPS = [
  'box-sizing',
  'display',
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'z-index',
  'flex-direction',
  'flex-wrap',
  'justify-content',
  'align-items',
  'align-self',
  'align-content',
  'gap',
  'row-gap',
  'column-gap',
  'grid-template-columns',
  'grid-template-rows',
  'place-items',
  'width',
  'min-width',
  'max-width',
  'height',
  'min-height',
  'max-height',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-top-style',
  'border-right-style',
  'border-bottom-style',
  'border-left-style',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-right-radius',
  'border-bottom-left-radius',
  'border-collapse',
  'opacity',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'line-height',
  'letter-spacing',
  'text-align',
  'text-transform',
  'text-decoration',
  'white-space',
  'word-break',
  'overflow',
  'overflow-wrap',
  'vertical-align',
  'list-style-type',
];

function rgbSafe(value, fallback = 'transparent') {
  if (!value || value === 'none') return fallback;
  const v = String(value).trim();
  if (/oklch|oklab|color\(/i.test(v)) return fallback;
  return v;
}

/**
 * Clone element with resolved RGB/hex inline styles so html2canvas
 * never parses Tailwind v4 oklch() colors from stylesheets.
 */
function buildRgbClone(element) {
  const host = document.createElement('div');
  host.setAttribute('data-pdf-capture-root', 'true');
  host.style.cssText = [
    'position:fixed',
    'left:-10000px',
    'top:0',
    'width:794px',
    'padding:0',
    'margin:0',
    'background:#ffffff',
    'color:#111827',
    'font-family:Arial,Helvetica,sans-serif',
    'z-index:-1',
    'pointer-events:none',
  ].join(';');

  const clone = element.cloneNode(true);
  host.appendChild(clone);
  document.body.appendChild(host);

  const sources = [element, ...element.querySelectorAll('*')];
  const targets = [clone, ...clone.querySelectorAll('*')];

  sources.forEach((src, index) => {
    const dst = targets[index];
    if (!dst || dst.nodeType !== 1) return;
    const computed = window.getComputedStyle(src);
    const chunks = [];
    STYLE_PROPS.forEach((prop) => {
      try {
        let value = computed.getPropertyValue(prop);
        if (!value) return;
        if (prop.endsWith('-color') || prop === 'color') {
          value = rgbSafe(value, prop === 'color' ? '#111827' : 'transparent');
        }
        chunks.push(`${prop}:${value}`);
      } catch {
        /* ignore unsupported props */
      }
    });
    chunks.push(`color:${rgbSafe(computed.color, '#111827')}`);
    const bg = computed.backgroundColor;
    chunks.push(
      `background-color:${bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent' ? 'transparent' : rgbSafe(bg, '#ffffff')}`
    );
    dst.style.cssText = chunks.join(';');
    dst.removeAttribute('class');
    // Final sweep: any leftover modern color functions break html2canvas.
    if (/oklch|oklab|color\(/i.test(dst.style.cssText)) {
      dst.style.cssText = dst.style.cssText
        .replace(/[^;]*oklch[^;]*/gi, '')
        .replace(/[^;]*oklab[^;]*/gi, '')
        .replace(/[^;]*color\([^;]*/gi, '');
      dst.style.color = '#111827';
      dst.style.backgroundColor = dst.style.backgroundColor || '#ffffff';
    }
  });

  return { host, clone };
}

/**
 * Print only the given element's content (not the full app screen).
 */
export function printElement(element, { title = 'Document', pageSize = 'A4' } = {}) {
  if (!element) return false;

  const win = window.open('', '_blank', 'width=900,height=1100');
  if (!win) {
    window.alert('Pop-up blocked. Allow pop-ups to print this document.');
    return false;
  }

  const { host, clone } = buildRgbClone(element);
  const safeTitle = String(title).replace(/</g, '&lt;');

  win.document.open();
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${safeTitle}</title>
  <style>
    @page { size: ${pageSize}; margin: 12mm; }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-family: Arial, Helvetica, sans-serif;
      color: #111827;
    }
    body { padding: 8mm !important; }
    .print-slip-root { max-width: 210mm; margin: 0 auto; background: #fff; }
  </style>
</head>
<body>
  <div class="print-slip-root"></div>
</body>
</html>`);
  win.document.close();

  const root = win.document.querySelector('.print-slip-root');
  root.appendChild(clone.cloneNode(true));
  host.remove();

  const triggerPrint = () => {
    win.focus();
    const closeSoon = () => {
      setTimeout(() => {
        try { win.close(); } catch { /* ignore */ }
      }, 300);
    };
    win.onafterprint = closeSoon;
    try {
      win.print();
    } catch {
      closeSoon();
    }
    setTimeout(closeSoon, 60_000);
  };

  setTimeout(triggerPrint, 250);
  return true;
}

/**
 * Capture the slip DOM and download a real PDF file.
 * Avoids oklch parsing errors from Tailwind v4 stylesheets.
 */
export async function downloadElementAsPdf(element, {
  fileName = 'document.pdf',
  title = 'Document',
} = {}) {
  if (!element) throw new Error('Nothing to download.');

  // Let the browser finish painting the slip before capture.
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  const { host, clone } = buildRgbClone(element);

  try {
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      imageTimeout: 15000,
      foreignObjectRendering: false,
      removeContainer: true,
      onclone: (doc) => {
        doc.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => node.remove());
        doc.querySelectorAll('[style]').forEach((node) => {
          const css = node.getAttribute('style') || '';
          if (/oklch|oklab|color\(/i.test(css)) {
            node.setAttribute(
              'style',
              css
                .replace(/[^;]*oklch[^;]*/gi, '')
                .replace(/[^;]*oklab[^;]*/gi, '')
                .replace(/[^;]*color\([^;]*/gi, '')
            );
            node.style.color = node.style.color || '#111827';
            if (!node.style.backgroundColor) node.style.backgroundColor = 'transparent';
          }
        });
      },
    });

    if (!canvas.width || !canvas.height) {
      throw new Error('Could not render payment slip for PDF.');
    }

    const imgData = canvas.toDataURL('image/png', 1.0);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2;
    const imgHeight = (canvas.height * usableWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    pdf.setProperties({ title: String(title) });
    pdf.addImage(imgData, 'PNG', margin, position, usableWidth, imgHeight, undefined, 'FAST');
    heightLeft -= usableHeight;

    while (heightLeft > 0) {
      position = margin - (imgHeight - heightLeft);
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, position, usableWidth, imgHeight, undefined, 'FAST');
      heightLeft -= usableHeight;
    }

    const base = sanitizeFileName(fileName.replace(/\.pdf$/i, ''));
    pdf.save(`${base}.pdf`);
    return true;
  } catch (err) {
    const msg = String(err?.message || err || '');
    if (/oklch|oklab|color function|attempting to parse/i.test(msg)) {
      throw new Error('PDF export failed due to unsupported page colors. Please try Print instead, or refresh and retry Download PDF.');
    }
    throw err instanceof Error ? err : new Error(msg || 'Could not download PDF.');
  } finally {
    host.remove();
  }
}
