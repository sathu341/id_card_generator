'use client';

import { useState, useRef } from 'react';
import { Download, RefreshCw, Check, FileImage, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import CardPreview from './CardPreview';
import { TemplateConfig } from '@/app/page';

interface Props {
  template: TemplateConfig;
  cards: { _id: string; rowIndex: number; data: Record<string, string> }[];
  totalRows: number;
}

export default function BulkExport({ template, cards, totalRows }: Props) {
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportDone, setExportDone] = useState(false);
  const [previewPage, setPreviewPage] = useState(0);
  const perPage = 6;

  const paginatedCards = cards.slice(previewPage * perPage, (previewPage + 1) * perPage);
  const totalPages = Math.ceil(cards.length / perPage);

  async function exportAll() {
    if (cards.length === 0) return;
    setExporting(true);
    setExportProgress(0);
    setExportDone(false);

    try {
      // Dynamically import html2canvas and JSZip
      const [html2canvasModule, JSZipModule] = await Promise.all([
        import('html2canvas'),
        import('jszip'),
      ]);
      const html2canvas = html2canvasModule.default;
      const JSZip = JSZipModule.default;

      const zip = new JSZip();

      // Create a hidden container
      const container = document.createElement('div');
      container.style.cssText = `
        position: fixed;
        top: -9999px;
        left: -9999px;
        width: ${template.canvasWidth}px;
        height: ${template.canvasHeight}px;
        overflow: hidden;
      `;
      document.body.appendChild(container);

      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        setExportProgress(Math.round(((i + 1) / cards.length) * 100));

        // Create card element
        const cardEl = document.createElement('div');
        cardEl.style.cssText = `
          width: ${template.canvasWidth}px;
          height: ${template.canvasHeight}px;
          position: relative;
          overflow: hidden;
          border-radius: 8px;
          ${
            template.backgroundImage
              ? `background: url(${template.backgroundImage}) center/cover no-repeat;`
              : 'background: linear-gradient(135deg, #1e1e35 0%, #2d2d50 100%);'
          }
        `;

        // Background overlay if no custom bg
        if (!template.backgroundImage) {
          const overlay = document.createElement('div');
          overlay.style.cssText = `
            position: absolute;
            inset: 0;
            background: linear-gradient(135deg, rgba(67,56,202,0.85) 0%, rgba(79,70,229,0.65) 100%);
          `;
          cardEl.appendChild(overlay);
        }

        // Render fields
        for (const field of template.fields) {
          if (!field.visible) continue;

          const el = document.createElement('div');
          el.style.cssText = `
            position: absolute;
            left: ${field.x}px;
            top: ${field.y}px;
            width: ${field.width}px;
            height: ${field.height}px;
            overflow: hidden;
            border-radius: ${field.borderRadius || 0}px;
            padding: ${field.padding || 2}px;
            display: flex;
            align-items: center;
            justify-content: ${field.align === 'center' ? 'center' : field.align === 'right' ? 'flex-end' : 'flex-start'};
            background: ${field.backgroundColor !== 'transparent' ? field.backgroundColor : 'transparent'};
          `;

          const raw = card.data[field.key] || '';

          if (field.isPhoto) {
            el.style.border = '2px solid rgba(255,255,255,0.3)';
            const img = document.createElement('img');

            // Resolve Google Drive URL
            let photoUrl = raw;
            if (raw.includes('drive.google.com') || raw.includes('open?id=')) {
              const match = raw.match(/[?&]id=([a-zA-Z0-9_-]+)/);
              const fileId = match?.[1];
              photoUrl = fileId ? `/api/proxy-image?fileId=${fileId}` : raw;
            }

            img.src = photoUrl || '/api/placeholder-avatar?text=P';
            img.crossOrigin = 'anonymous';
            img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
            img.onerror = () => { img.src = '/api/placeholder-avatar?text=P'; };
            el.appendChild(img);

            // Wait for image to load
            await new Promise<void>((resolve) => {
              if (img.complete) resolve();
              else {
                img.onload = () => resolve();
                img.onerror = () => resolve();
                setTimeout(resolve, 3000);
              }
            });
          } else {
            let text = raw;
            if (field.textTransform === 'uppercase') text = text.toUpperCase();
            if (field.textTransform === 'lowercase') text = text.toLowerCase();
            if (field.textTransform === 'capitalize') text = text.replace(/\b\w/g, (c) => c.toUpperCase());

            el.innerHTML = `<span style="
              font-size:${field.fontSize}px;
              font-weight:${field.fontWeight || 400};
              color:${field.color || '#fff'};
              font-family:${field.fontFamily || 'Arial,sans-serif'};
              text-align:${field.align || 'left'};
              width:100%;
              line-height:1.3;
              word-break:break-word;
            ">${text}</span>`;
          }

          cardEl.appendChild(el);
        }

        container.appendChild(cardEl);

        try {
          const canvas = await html2canvas(cardEl, {
            scale: 2,
            useCORS: true,
            allowTaint: false,
            logging: false,
            backgroundColor: null,
          });

          const blob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((b) => resolve(b!), 'image/png', 1);
          });

          const name = card.data['name_correct_spelling_'] ||
            card.data['name'] ||
            card.data[Object.keys(card.data).find((k) => k.includes('name')) || ''] ||
            `card_${i + 1}`;

          zip.file(`${String(i + 1).padStart(3, '0')}_${name.replace(/[^a-zA-Z0-9]/g, '_')}.png`, blob);
        } catch (e) {
          console.error('Card render error:', e);
        }

        container.removeChild(cardEl);
        await new Promise((r) => setTimeout(r, 50));
      }

      document.body.removeChild(container);

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `id-cards-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      setExportDone(true);
    } catch (e) {
      console.error('Export error:', e);
    } finally {
      setExporting(false);
    }
  }

  async function exportSingle(card: (typeof cards)[0], name: string) {
    const html2canvasModule = await import('html2canvas');
    const html2canvas = html2canvasModule.default;

    const container = document.createElement('div');
    container.style.cssText = `position:fixed;top:-9999px;left:-9999px;`;
    document.body.appendChild(container);

    const cardEl = document.createElement('div');
    cardEl.style.cssText = `
      width:${template.canvasWidth}px;height:${template.canvasHeight}px;
      background:${template.backgroundImage ? `url(${template.backgroundImage}) center/cover` : 'linear-gradient(135deg,#1e1e35,#2d2d50)'};
      position:relative;overflow:hidden;border-radius:8px;
    `;
    container.appendChild(cardEl);

    for (const field of template.fields) {
      if (!field.visible) continue;
      const el = document.createElement('div');
      el.style.cssText = `position:absolute;left:${field.x}px;top:${field.y}px;width:${field.width}px;height:${field.height}px;overflow:hidden;`;

      const raw = card.data[field.key] || '';
      if (field.isPhoto) {
        const match = raw.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        const fileId = match?.[1];
        const src = fileId ? `/api/proxy-image?fileId=${fileId}` : raw || '/api/placeholder-avatar?text=P';
        el.innerHTML = `<img src="${src}" crossorigin="anonymous" style="width:100%;height:100%;object-fit:cover;border-radius:${field.borderRadius}px;" />`;
      } else {
        let text = raw;
        if (field.textTransform === 'uppercase') text = text.toUpperCase();
        el.innerHTML = `<span style="font-size:${field.fontSize}px;font-weight:${field.fontWeight};color:${field.color};font-family:${field.fontFamily};padding:${field.padding}px;">${text}</span>`;
      }
      cardEl.appendChild(el);
    }

    await new Promise((r) => setTimeout(r, 500));
    const canvas = await html2canvas(cardEl, { scale: 2, useCORS: true, allowTaint: false, logging: false });
    document.body.removeChild(container);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png', 1);
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Export ID Cards</h2>
        <p className="text-slate-400 text-sm">{totalRows} cards ready · PNG format · High resolution (2×)</p>
      </div>

      {/* Export Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
        <button
          onClick={exportAll}
          disabled={exporting || cards.length === 0}
          className="flex flex-col items-center gap-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold p-6 rounded-2xl transition-all group"
        >
          {exporting ? (
            <>
              <RefreshCw size={32} className="animate-spin" />
              <span>Exporting... {exportProgress}%</span>
              <div className="w-full bg-indigo-800 rounded-full h-2">
                <div
                  className="bg-white rounded-full h-2 transition-all"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </>
          ) : exportDone ? (
            <>
              <Check size={32} className="text-emerald-300" />
              <span>Downloaded!</span>
            </>
          ) : (
            <>
              <Package size={32} className="group-hover:scale-110 transition-transform" />
              <span>Export All as ZIP</span>
              <span className="text-indigo-200 text-xs font-normal">{totalRows} PNG files</span>
            </>
          )}
        </button>

        <div className="glass rounded-2xl p-6 space-y-2 border border-white/10">
          <FileImage size={32} className="text-indigo-400" />
          <p className="text-white font-semibold">Export Stats</p>
          <div className="space-y-1 text-sm text-slate-400">
            <div className="flex justify-between">
              <span>Total cards</span>
              <span className="text-white">{totalRows}</span>
            </div>
            <div className="flex justify-between">
              <span>Resolution</span>
              <span className="text-white">{template.canvasWidth * 2}×{template.canvasHeight * 2}px</span>
            </div>
            <div className="flex justify-between">
              <span>Format</span>
              <span className="text-white">PNG (transparent)</span>
            </div>
            <div className="flex justify-between">
              <span>Fields</span>
              <span className="text-white">{template.fields.filter((f) => f.visible).length} visible</span>
            </div>
          </div>
        </div>
      </div>

      {/* Card Grid Preview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Card Preview Grid</h3>
          <div className="flex items-center gap-2">
            <button
              disabled={previewPage === 0}
              onClick={() => setPreviewPage((p) => p - 1)}
              className="bg-white/10 hover:bg-white/20 text-white p-1.5 rounded-lg disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-slate-400 text-sm">{previewPage + 1}/{Math.max(totalPages, 1)}</span>
            <button
              disabled={previewPage >= totalPages - 1}
              onClick={() => setPreviewPage((p) => p + 1)}
              className="bg-white/10 hover:bg-white/20 text-white p-1.5 rounded-lg disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedCards.map((card, i) => {
            const name =
              card.data['name_correct_spelling_'] ||
              card.data['name'] ||
              `Card ${card.rowIndex + 1}`;
            return (
              <div key={card._id} className="space-y-2">
                <div className="overflow-hidden" style={{ borderRadius: 8 }}>
                  <CardPreview template={template} data={card.data} scale={0.7} />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-slate-400 text-xs truncate">{name}</p>
                  <button
                    onClick={() => exportSingle(card, name)}
                    className="text-indigo-400 hover:text-indigo-300 text-xs flex items-center gap-1"
                  >
                    <Download size={11} />
                    PNG
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
