// Phones can't open a print window (Android app, iPhone/Android browsers), so documents are turned
// into a real A4 PDF and handed to the share sheet (WhatsApp, email, Drive, printer apps, Files…).
import { IS_NATIVE } from '../config';

export const isPhone = () => IS_NATIVE || (typeof window !== 'undefined' && window.matchMedia?.('(max-width: 820px), (pointer: coarse)').matches);

const safeName = (s) => `${String(s || 'document').replace(/[^\w\s.-]+/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'document'}.pdf`;

/** Renders an element (each `.print-area` inside it becomes its own A4 page) to a PDF blob. */
export async function elementToPdf(root) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  // Lay the copy out at A4 width (794 CSS px) off-screen so it looks the same as on a computer.
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-20000px;top:0;width:794px;background:#fff;color:#1e293b;z-index:-1';
  const clone = root.cloneNode(true);
  host.appendChild(clone);
  // On-screen-only bits are dropped; PDF-only bits (e.g. a company header) are shown.
  clone.querySelectorAll('.no-print').forEach((e) => e.remove());
  clone.querySelectorAll('[data-pdf]').forEach((e) => { e.classList.remove('hidden'); e.style.display = 'flex'; });
  // Canvases (QR codes, charts) don't copy their pixels when cloned.
  const src = root.querySelectorAll('canvas');
  clone.querySelectorAll('canvas').forEach((c, i) => {
    try {
      const img = document.createElement('img');
      img.src = src[i].toDataURL('image/png');
      img.className = c.className;
      img.style.cssText = c.style.cssText;
      c.replaceWith(img);
    } catch { /* tainted canvas: leave blank */ }
  });
  // Always render the light version (dark mode would give white text on the white page).
  const wasDark = document.documentElement.classList.contains('dark');
  document.documentElement.classList.remove('dark');
  document.body.appendChild(host);
  await Promise.all([...host.querySelectorAll('img')].map((i) => (i.complete ? null : new Promise((r) => { i.onload = r; i.onerror = r; }))));
  const pages = [...host.querySelectorAll('.print-area')];
  const targets = pages.length ? pages : [clone];
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const M = 18;
  let first = true;
  try {
    for (const t of targets) {
      t.style.boxShadow = 'none';
      t.style.margin = '0';
      const canvas = await html2canvas(t, { scale: 2, backgroundColor: '#ffffff', useCORS: true, windowWidth: 794, logging: false });
      const w = W - M * 2;
      const pxPerPt = canvas.width / w;
      const sliceH = Math.floor((H - M * 2) * pxPerPt);
      for (let y = 0; y < canvas.height; y += sliceH) {
        const part = document.createElement('canvas');
        part.width = canvas.width;
        part.height = Math.min(sliceH, canvas.height - y);
        part.getContext('2d').drawImage(canvas, 0, y, canvas.width, part.height, 0, 0, canvas.width, part.height);
        if (!first) pdf.addPage();
        first = false;
        pdf.addImage(part.toDataURL('image/jpeg', 0.92), 'JPEG', M, M, w, part.height / pxPerPt);
      }
    }
  } finally {
    host.remove();
    if (wasDark) document.documentElement.classList.add('dark');
  }
  return pdf.output('blob');
}

const toBase64 = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(',')[1]);
  r.onerror = reject;
  r.readAsDataURL(blob);
});

/** Opens the share sheet with the PDF (or downloads it where sharing files isn't possible). */
export async function sharePdf(blob, title) {
  const name = safeName(title);
  if (IS_NATIVE) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')]);
    const { uri } = await Filesystem.writeFile({ path: name, data: await toBase64(blob), directory: Directory.Cache });
    await Share.share({ title, files: [uri], dialogTitle: 'Share or save PDF' });
    return 'shared';
  }
  const file = new File([blob], name, { type: 'application/pdf' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return 'shared';
    } catch (e) {
      if (e?.name === 'AbortError') return 'cancelled';
    }
  }
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  return 'downloaded';
}
