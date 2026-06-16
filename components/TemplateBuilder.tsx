'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Plus, Trash2, Eye, EyeOff, Image, Type, Move,
  AlignLeft, AlignCenter, AlignRight, ChevronDown, ChevronUp,
  Upload, Maximize2, RotateCcw, Save, Check, RefreshCw, Layers
} from 'lucide-react';
import { TemplateConfig, FieldConfig } from '@/app/page';

interface Props {
  template: TemplateConfig;
  setTemplate: (t: TemplateConfig | ((prev: TemplateConfig) => TemplateConfig)) => void;
  columns: { original: string; normalized: string; isPhoto: boolean }[];
  sampleData: Record<string, string>;
  onSave: () => void;
  saveStatus: string;
}

const FONTS = ['Inter, sans-serif', 'Arial, sans-serif', 'Georgia, serif', 'Courier New, monospace', "'Times New Roman', serif"];
const FONT_SIZES = [8, 10, 11, 12, 13, 14, 16, 18, 20, 22, 24, 28, 32, 36, 40, 44, 48, 56, 64, 72];

export default function TemplateBuilder({ template, setTemplate, columns, sampleData, onSave, saveStatus }: Props) {
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    fieldId: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const [resizeState, setResizeState] = useState<{
    fieldId: string;
    startX: number;
    startY: number;
    origW: number;
    origH: number;
  } | null>(null);
  const [dropZone, setDropZone] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLInputElement>(null);

  const scale = 2; // canvas display scale
  const displayW = template.canvasWidth * scale;
  const displayH = template.canvasHeight * scale;

  const updateField = (id: string, updates: Partial<FieldConfig>) => {
    setTemplate((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    }));
  };

  const selectedField = template.fields.find((f) => f.id === selectedFieldId);

  function isNameField(key: string, label: string) {
    const lower = (key + ' ' + label).toLowerCase();
    return lower.includes('name') && !lower.includes('father') && !lower.includes('mother') && !lower.includes('parent');
  }

  function addField(col?: { original: string; normalized: string; isPhoto: boolean }) {
    const isPhoto = col?.isPhoto ?? false;
    const colKey = col?.normalized || 'custom';
    const colLabel = col?.original.replace(/\s*\(.*?\)\s*/g, '').trim() || 'Custom Field';
    const isName = !isPhoto && isNameField(colKey, colLabel);
    const fontSize = isPhoto ? 12 : isName ? 40 : 14;
    const newField: FieldConfig = {
      id: `field_${Date.now()}`,
      key: colKey,
      label: colLabel,
      x: 20,
      y: 20 + template.fields.length * 50,
      width: isPhoto ? 80 : isName ? 280 : 200,
      height: isPhoto ? 80 : Math.max(28, Math.round(fontSize * 1.6)),
      fontSize,
      fontWeight: isName ? '700' : '400',
      color: '#000000',
      align: 'left',
      visible: true,
      isPhoto,
      fontFamily: 'Inter, sans-serif',
      textTransform: 'none',
      backgroundColor: 'transparent',
      borderRadius: isPhoto ? 50 : 0,
      padding: 2,
    };
    setTemplate((prev) => ({ ...prev, fields: [...prev.fields, newField] }));
    setSelectedFieldId(newField.id);
  }

  function removeField(id: string) {
    setTemplate((prev) => ({ ...prev, fields: prev.fields.filter((f) => f.id !== id) }));
    if (selectedFieldId === id) setSelectedFieldId(null);
  }

  function autoGenerateFields() {
    const fields: FieldConfig[] = columns.map((col, i) => {
      const label = col.original.replace(/\s*\(.*?\)\s*/g, '').trim().split(' ').slice(0, 3).join(' ');
      const isName = !col.isPhoto && isNameField(col.normalized, label);
      const fontSize = col.isPhoto ? 12 : isName ? 40 : 14;
      return {
        id: `field_${col.normalized}_${Date.now()}_${i}`,
        key: col.normalized,
        label,
        x: col.isPhoto ? 10 : 100,
        y: col.isPhoto ? 10 : 10 + (i - (columns.findIndex((c) => c.isPhoto) !== -1 ? 1 : 0)) * 50,
        width: col.isPhoto ? 80 : isName ? 280 : 250,
        height: col.isPhoto ? 80 : Math.max(28, Math.round(fontSize * 1.6)),
        fontSize,
        fontWeight: isName ? '700' : '400',
        color: '#000000',
        align: 'left',
        visible: true,
        isPhoto: col.isPhoto,
        fontFamily: 'Inter, sans-serif',
        textTransform: 'none',
        backgroundColor: 'transparent',
        borderRadius: col.isPhoto ? 50 : 0,
        padding: 2,
      };
    });
    setTemplate((prev) => ({ ...prev, fields }));
  }

  // Mouse drag for moving fields
  const handleMouseDown = (e: React.MouseEvent, fieldId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedFieldId(fieldId);
    const field = template.fields.find((f) => f.id === fieldId)!;
    setDragState({
      fieldId,
      startX: e.clientX,
      startY: e.clientY,
      origX: field.x,
      origY: field.y,
    });
  };

  const handleResizeMouseDown = (e: React.MouseEvent, fieldId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const field = template.fields.find((f) => f.id === fieldId)!;
    setResizeState({
      fieldId,
      startX: e.clientX,
      startY: e.clientY,
      origW: field.width,
      origH: field.height,
    });
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (dragState) {
        const dx = (e.clientX - dragState.startX) / scale;
        const dy = (e.clientY - dragState.startY) / scale;
        const field = template.fields.find((f) => f.id === dragState.fieldId)!;
        const newX = Math.max(0, Math.min(template.canvasWidth - field.width, dragState.origX + dx));
        const newY = Math.max(0, Math.min(template.canvasHeight - field.height, dragState.origY + dy));
        updateField(dragState.fieldId, { x: Math.round(newX), y: Math.round(newY) });
      }
      if (resizeState) {
        const dx = (e.clientX - resizeState.startX) / scale;
        const dy = (e.clientY - resizeState.startY) / scale;
        const newW = Math.max(30, Math.round(resizeState.origW + dx));
        const newH = Math.max(16, Math.round(resizeState.origH + dy));
        updateField(resizeState.fieldId, { width: newW, height: newH });
      }
    },
    [dragState, resizeState, template, scale]
  );

  const handleMouseUp = () => {
    setDragState(null);
    setResizeState(null);
  };

  async function handleBgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadBgFile(file);
    e.target.value = '';
  }

  async function uploadBgFile(file: File) {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/template/upload', { method: 'POST', body: form });
    const data = await res.json();
    if (data.success) {
      setTemplate((prev) => ({
        ...prev,
        backgroundImage: data.dataUrl,
        backgroundImageName: data.name,
      }));
    }
  }

  function handleCanvasDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDropZone(true);
  }

  function handleCanvasDragLeave(e: React.DragEvent) {
    setDropZone(false);
  }

  async function handleCanvasDrop(e: React.DragEvent) {
    e.preventDefault();
    setDropZone(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      await uploadBgFile(file);
    }
  }

  function getDisplayValue(field: FieldConfig) {
    const raw = sampleData[field.key] || '';
    if (!raw) return `[${field.label}]`;
    let v = raw;
    if (field.textTransform === 'uppercase') v = v.toUpperCase();
    if (field.textTransform === 'lowercase') v = v.toLowerCase();
    if (field.textTransform === 'capitalize') v = v.replace(/\b\w/g, (c) => c.toUpperCase());
    return v;
  }

  return (
    <div className="flex gap-6 h-full">
      {/* Left Panel - Fields List */}
      <div className="w-64 shrink-0 space-y-4">
        <div className="glass rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold text-sm">Fields</h3>
            <button
              onClick={autoGenerateFields}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              title="Auto-generate from columns"
            >
              <RotateCcw size={12} />
              Auto
            </button>
          </div>

          <div className="space-y-1 max-h-48 overflow-y-auto">
            {template.fields.map((field) => (
              <div
                key={field.id}
                onClick={() => setSelectedFieldId(field.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all text-sm ${
                  selectedFieldId === field.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-white/10'
                }`}
              >
                {field.isPhoto ? <Image size={12} /> : <Type size={12} />}
                <span className="flex-1 truncate">{field.label}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); updateField(field.id, { visible: !field.visible }); }}
                  className="opacity-60 hover:opacity-100"
                >
                  {field.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); removeField(field.id); }}
                  className="opacity-60 hover:opacity-100 text-red-400"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {template.fields.length === 0 && (
              <p className="text-slate-500 text-xs text-center py-2">No fields yet</p>
            )}
          </div>

          {/* Add Field Dropdown */}
          <div className="space-y-1">
            <p className="text-slate-500 text-xs font-medium">Add from columns:</p>
            {columns.slice(0, 6).map((col) => (
              <button
                key={col.normalized}
                onClick={() => addField(col)}
                className="w-full text-left text-xs text-slate-400 hover:text-white px-2 py-1.5 rounded hover:bg-white/10 transition-all flex items-center gap-2"
              >
                <Plus size={10} className="text-indigo-400" />
                {col.original.replace(/\s*\(.*?\)\s*/g, '').trim().slice(0, 25)}
                {col.isPhoto && <span className="text-purple-400 ml-auto">photo</span>}
              </button>
            ))}
            <button
              onClick={() => addField()}
              className="w-full text-left text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1.5 rounded hover:bg-indigo-500/10 transition-all flex items-center gap-2"
            >
              <Plus size={10} />
              Custom field
            </button>
          </div>
        </div>

        {/* Canvas Size */}
        <div className="glass rounded-2xl p-4 space-y-3">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <Maximize2 size={14} className="text-indigo-400" />
            Canvas Size
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'CR80 (Card)', w: 336, h: 212 },
              { label: 'A6 Portrait', w: 250, h: 350 },
              { label: 'Square', w: 300, h: 300 },
              { label: 'Wide Card', w: 450, h: 250 },
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={() => setTemplate((prev) => ({ ...prev, canvasWidth: preset.w, canvasHeight: preset.h }))}
                className="text-xs bg-white/5 hover:bg-indigo-600/30 text-slate-300 hover:text-white px-2 py-2 rounded-lg transition-all text-center leading-tight"
              >
                {preset.label}
                <span className="block text-slate-500 text-[10px]">{preset.w}×{preset.h}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-slate-500 text-xs">W (px)</label>
              <input
                type="number"
                value={template.canvasWidth}
                onChange={(e) => setTemplate((prev) => ({ ...prev, canvasWidth: +e.target.value }))}
                className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-lg px-2 py-1.5 mt-1"
              />
            </div>
            <div className="flex-1">
              <label className="text-slate-500 text-xs">H (px)</label>
              <input
                type="number"
                value={template.canvasHeight}
                onChange={(e) => setTemplate((prev) => ({ ...prev, canvasHeight: +e.target.value }))}
                className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-lg px-2 py-1.5 mt-1"
              />
            </div>
          </div>
        </div>

        {/* Background / Template Image Upload */}
        <div className="glass rounded-2xl p-4 space-y-3">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <Upload size={14} className="text-indigo-400" />
            Template Background
          </h3>
          <input ref={bgRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />

          {template.backgroundImage ? (
            <div className="space-y-2">
              {/* Thumbnail preview */}
              <div
                className="w-full h-24 rounded-xl overflow-hidden border border-white/10 relative"
                style={{ background: `url(${template.backgroundImage}) center/cover no-repeat` }}
              >
                <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => bgRef.current?.click()}
                    className="text-white text-xs bg-indigo-600/80 px-2 py-1 rounded-lg"
                  >
                    Change
                  </button>
                </div>
              </div>
              <p className="text-slate-400 text-xs truncate">{template.backgroundImageName}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => bgRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 text-xs px-2 py-2 rounded-lg transition-all"
                >
                  <Upload size={12} /> Change
                </button>
                <button
                  onClick={() => setTemplate((prev) => ({ ...prev, backgroundImage: '', backgroundImageName: '' }))}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs px-2 py-2 rounded-lg transition-all"
                >
                  <Trash2 size={12} /> Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => bgRef.current?.click()}
              className="w-full flex flex-col items-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 border-2 border-dashed border-indigo-500/40 hover:border-indigo-400/70 text-slate-300 text-sm px-3 py-5 rounded-xl transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center group-hover:bg-indigo-500/30 transition-all">
                <Upload size={20} className="text-indigo-400" />
              </div>
              <div className="text-center">
                <p className="text-white text-xs font-medium">Click to upload template</p>
                <p className="text-slate-500 text-[10px] mt-0.5">PNG, JPG, SVG — or drag onto canvas</p>
              </div>
            </button>
          )}
        </div>

        {/* Save button */}
        <button
          onClick={onSave}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          {saveStatus === 'saving' ? <RefreshCw size={16} className="animate-spin" /> : saveStatus === 'saved' ? <Check size={16} /> : <Save size={16} />}
          {saveStatus === 'saved' ? 'Saved!' : 'Save Template'}
        </button>
      </div>

      {/* Center - Canvas */}
      <div className="flex-1 flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <Move size={12} />
          <span>Drag fields to reposition · Drag corner to resize · Right-panel to style</span>
        </div>
        <div
          ref={canvasRef}
          className="relative overflow-hidden"
          style={{
            width: displayW,
            height: displayH,
            background: template.backgroundImage
              ? `url(${template.backgroundImage}) center/cover no-repeat`
              : dropZone
              ? 'linear-gradient(135deg, #1e1e35 0%, #2d2d50 100%)'
              : 'linear-gradient(135deg, #1e1e35 0%, #2d2d50 100%)',
            borderRadius: 12,
            boxShadow: dropZone
              ? '0 25px 60px -10px rgba(0,0,0,0.8), 0 0 0 3px rgba(99,102,241,0.8)'
              : '0 25px 60px -10px rgba(0,0,0,0.8), 0 0 0 1px rgba(99,102,241,0.3)',
            cursor: dragState || resizeState ? 'grabbing' : 'default',
            transition: 'box-shadow 0.2s',
          }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={() => setSelectedFieldId(null)}
          onDragOver={handleCanvasDragOver}
          onDragLeave={handleCanvasDragLeave}
          onDrop={handleCanvasDrop}
        >
          {!template.backgroundImage && !dropZone && (
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(135deg, rgba(67,56,202,0.85) 0%, rgba(79,70,229,0.65) 100%)' }}
            />
          )}

          {/* Drop zone overlay – shown when dragging an image over the canvas */}
          {dropZone && (
            <div
              className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3"
              style={{
                background: 'rgba(99,102,241,0.25)',
                backdropFilter: 'blur(4px)',
                border: '3px dashed rgba(99,102,241,0.9)',
                borderRadius: 12,
                pointerEvents: 'none',
              }}
            >
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/30 flex items-center justify-center">
                <Upload size={32} className="text-indigo-200" />
              </div>
              <p className="text-white font-semibold text-base">Drop image to set as background</p>
              <p className="text-indigo-200 text-xs">PNG, JPG, SVG supported</p>
            </div>
          )}

          {/* Empty canvas prompt – click or drag to upload when no background set */}
          {!template.backgroundImage && !dropZone && template.fields.length === 0 && (
            <button
              onClick={() => bgRef.current?.click()}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 group"
              style={{ pointerEvents: 'all' }}
            >
              <div
                className="flex flex-col items-center gap-3 p-8 rounded-2xl transition-all"
                style={{ background: 'rgba(99,102,241,0.08)', border: '2px dashed rgba(99,102,241,0.35)' }}
              >
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center group-hover:bg-indigo-500/40 transition-all">
                  <Upload size={28} className="text-indigo-300" />
                </div>
                <div className="text-center">
                  <p className="text-white font-semibold">Upload your ID card template</p>
                  <p className="text-indigo-200/60 text-xs mt-1">Click here or drag &amp; drop an image onto this canvas</p>
                  <p className="text-slate-500 text-xs mt-0.5">PNG · JPG · SVG · WebP</p>
                </div>
              </div>
            </button>
          )}

          {/* Grid dots */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)',
              backgroundSize: `${20 * scale}px ${20 * scale}px`,
            }}
          />

          {template.fields.map((field) => {
            if (!field.visible) return null;
            const x = field.x * scale;
            const y = field.y * scale;
            const w = field.width * scale;
            const h = field.height * scale;
            const fs = field.fontSize * scale;
            const isSelected = selectedFieldId === field.id;

            return (
              <div
                key={field.id}
                onMouseDown={(e) => handleMouseDown(e, field.id)}
                onClick={(e) => { e.stopPropagation(); setSelectedFieldId(field.id); }}
                style={{
                  position: 'absolute',
                  left: x,
                  top: y,
                  width: w,
                  height: h,
                  cursor: dragState?.fieldId === field.id ? 'grabbing' : 'grab',
                  border: isSelected ? '2px solid #6366f1' : '1px dashed rgba(255,255,255,0.2)',
                  borderRadius: (field.borderRadius || 0) * scale,
                  backgroundColor: field.backgroundColor !== 'transparent' ? field.backgroundColor : 'transparent',
                  boxShadow: isSelected ? '0 0 0 3px rgba(99,102,241,0.3)' : 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: field.align === 'center' ? 'center' : field.align === 'right' ? 'flex-end' : 'flex-start',
                  userSelect: 'none',
                }}
              >
                {field.isPhoto ? (
                  <div
                    className="w-full h-full bg-indigo-500/20 flex items-center justify-center"
                    style={{ pointerEvents: 'none' }}
                  >
                    <Image size={fs * 1.5} className="text-indigo-300 opacity-60" />
                    {isSelected && (
                      <span
                        className="absolute bottom-1 left-1 text-white text-[8px] bg-indigo-600/80 px-1 rounded"
                        style={{ pointerEvents: 'none' }}
                      >
                        {field.label}
                      </span>
                    )}
                    {/* Drag hint */}
                    <div
                      className="absolute top-1 right-1 opacity-50"
                      style={{ pointerEvents: 'none' }}
                    >
                      <Move size={10} className="text-white" />
                    </div>
                  </div>
                ) : (
                  <span
                    style={{
                      fontSize: fs,
                      fontWeight: field.fontWeight || '400',
                      color: field.color || '#000000',
                      fontFamily: field.fontFamily || 'Inter, sans-serif',
                      padding: `${(field.padding || 2) * scale}px`,
                      lineHeight: 1.3,
                      pointerEvents: 'none',
                      width: '100%',
                      textAlign: field.align as any,
                      textShadow: field.color && field.color.toLowerCase() === '#ffffff'
                        ? '0 1px 3px rgba(0,0,0,0.5)'
                        : field.color && field.color.toLowerCase() === '#000000'
                        ? '0 1px 2px rgba(255,255,255,0.3)'
                        : 'none',
                      letterSpacing: '0.01em',
                    }}
                  >
                    {getDisplayValue(field)}
                  </span>
                )}

                {/* Resize handle */}
                {isSelected && (
                  <div
                    onMouseDown={(e) => handleResizeMouseDown(e, field.id)}
                    style={{
                      position: 'absolute',
                      right: 0,
                      bottom: 0,
                      width: 12,
                      height: 12,
                      background: '#6366f1',
                      cursor: 'se-resize',
                      borderRadius: '2px 0 4px 0',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        <p className="text-slate-600 text-xs">
          {displayW}×{displayH}px display (actual: {template.canvasWidth}×{template.canvasHeight}px)
        </p>
      </div>

      {/* Right Panel - Field Properties */}
      <div className="w-64 shrink-0">
        {selectedField ? (
          <div className="glass rounded-2xl p-4 space-y-4 sticky top-24">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold text-sm">Field Properties</h3>
              <button
                onClick={() => removeField(selectedField.id)}
                className="text-red-400 hover:text-red-300"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {/* Key mapping */}
            <div>
              <label className="text-slate-400 text-xs">Data Field Key</label>
              <select
                value={selectedField.key}
                onChange={(e) => updateField(selectedField.id, { key: e.target.value })}
                className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-lg px-2 py-2 mt-1"
              >
                {columns.map((col) => (
                  <option key={col.normalized} value={col.normalized} style={{ background: '#1e1e35' }}>
                    {col.normalized}
                  </option>
                ))}
                <option value="custom" style={{ background: '#1e1e35' }}>custom</option>
              </select>
            </div>

            {/* Label */}
            <div>
              <label className="text-slate-400 text-xs">Display Label</label>
              <input
                type="text"
                value={selectedField.label}
                onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-lg px-2 py-2 mt-1"
              />
            </div>

            {/* Position */}
            <div>
              <label className="text-slate-400 text-xs">Position</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {(['x', 'y', 'width', 'height'] as const).map((prop) => (
                  <div key={prop}>
                    <label className="text-slate-600 text-[10px]">{prop.toUpperCase()}</label>
                    <input
                      type="number"
                      value={selectedField[prop]}
                      onChange={(e) => updateField(selectedField.id, { [prop]: +e.target.value })}
                      className="w-full bg-white/5 border border-white/10 text-white text-xs rounded px-2 py-1.5"
                    />
                  </div>
                ))}
              </div>
            </div>

            {!selectedField.isPhoto && (
              <>
                {/* Font Size */}
                <div>
                  <label className="text-slate-400 text-xs">Font Size: {selectedField.fontSize}px</label>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => updateField(selectedField.id, { fontSize: Math.max(6, selectedField.fontSize - 1), height: Math.max(28, Math.round((selectedField.fontSize - 1) * 1.6)) })}
                      className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/15 border border-white/10 text-white text-sm rounded-lg transition-all"
                    >−</button>
                    <input
                      type="number"
                      min={6}
                      max={120}
                      value={selectedField.fontSize}
                      onChange={(e) => {
                        const v = Math.max(6, Math.min(120, +e.target.value || 6));
                        updateField(selectedField.id, { fontSize: v, height: Math.max(selectedField.height, Math.round(v * 1.6)) });
                      }}
                      className="flex-1 bg-white/5 border border-white/10 text-white text-sm text-center rounded-lg px-2 py-1.5 font-semibold"
                    />
                    <button
                      onClick={() => updateField(selectedField.id, { fontSize: Math.min(120, selectedField.fontSize + 1), height: Math.max(28, Math.round((selectedField.fontSize + 1) * 1.6)) })}
                      className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/15 border border-white/10 text-white text-sm rounded-lg transition-all"
                    >+</button>
                  </div>
                  {/* Quick size buttons */}
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {[12, 14, 18, 24, 32, 40, 48, 64].map((s) => (
                      <button
                        key={s}
                        onClick={() => updateField(selectedField.id, { fontSize: s, height: Math.max(selectedField.height, Math.round(s * 1.6)) })}
                        className={`px-2 py-1 text-[10px] rounded-md transition-all ${
                          selectedField.fontSize === s
                            ? 'bg-indigo-600 text-white font-semibold'
                            : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Weight */}
                <div>
                  <label className="text-slate-400 text-xs">Font Weight</label>
                  <select
                    value={selectedField.fontWeight}
                    onChange={(e) => updateField(selectedField.id, { fontWeight: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-lg px-2 py-2 mt-1"
                  >
                    {[{v:'300',l:'Light'},{v:'400',l:'Regular'},{v:'500',l:'Medium'},{v:'600',l:'Semi Bold'},{v:'700',l:'Bold'},{v:'800',l:'Extra Bold'}].map((w) => (
                      <option key={w.v} value={w.v} style={{ background: '#1e1e35' }}>{w.l} ({w.v})</option>
                    ))}
                  </select>
                </div>

                {/* Text Color */}
                <div>
                  <label className="text-slate-400 text-xs">Text Color</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="color"
                      value={selectedField.color}
                      onChange={(e) => updateField(selectedField.id, { color: e.target.value })}
                      className="w-10 h-9 rounded-lg border border-white/10 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={selectedField.color}
                      onChange={(e) => updateField(selectedField.id, { color: e.target.value })}
                      className="flex-1 bg-white/5 border border-white/10 text-white text-xs rounded-lg px-2"
                    />
                  </div>
                  {/* Quick color presets */}
                  <div className="flex gap-1.5 mt-1.5">
                    {[
                      { color: '#000000', label: 'Black' },
                      { color: '#ffffff', label: 'White' },
                      { color: '#1e3a5f', label: 'Navy' },
                      { color: '#b91c1c', label: 'Red' },
                      { color: '#15803d', label: 'Green' },
                      { color: '#6d28d9', label: 'Purple' },
                      { color: '#ca8a04', label: 'Gold' },
                    ].map((preset) => (
                      <button
                        key={preset.color}
                        title={preset.label}
                        onClick={() => updateField(selectedField.id, { color: preset.color })}
                        className={`w-6 h-6 rounded-md border-2 transition-all ${
                          selectedField.color.toLowerCase() === preset.color
                            ? 'border-indigo-400 scale-110'
                            : 'border-white/20 hover:border-white/50'
                        }`}
                        style={{ backgroundColor: preset.color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Alignment */}
                <div>
                  <label className="text-slate-400 text-xs">Alignment</label>
                  <div className="flex gap-1 mt-1">
                    {(['left', 'center', 'right'] as const).map((align) => (
                      <button
                        key={align}
                        onClick={() => updateField(selectedField.id, { align })}
                        className={`flex-1 flex items-center justify-center py-2 rounded-lg transition-all ${
                          selectedField.align === align
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white/5 text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        {align === 'left' ? <AlignLeft size={13} /> : align === 'center' ? <AlignCenter size={13} /> : <AlignRight size={13} />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font family */}
                <div>
                  <label className="text-slate-400 text-xs">Font Family</label>
                  <select
                    value={selectedField.fontFamily}
                    onChange={(e) => updateField(selectedField.id, { fontFamily: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-lg px-2 py-2 mt-1"
                  >
                    {FONTS.map((f) => (
                      <option key={f} value={f} style={{ background: '#1e1e35', fontFamily: f }}>
                        {f.split(',')[0].replace(/'/g, '')}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Transform */}
                <div>
                  <label className="text-slate-400 text-xs">Text Transform</label>
                  <div className="grid grid-cols-2 gap-1 mt-1">
                    {['none', 'uppercase', 'lowercase', 'capitalize'].map((t) => (
                      <button
                        key={t}
                        onClick={() => updateField(selectedField.id, { textTransform: t })}
                        className={`text-xs py-1.5 rounded-lg transition-all ${
                          selectedField.textTransform === t
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white/5 text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        {t === 'none' ? 'None' : t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Background color */}
                <div>
                  <label className="text-slate-400 text-xs">Background Color</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="color"
                      value={selectedField.backgroundColor === 'transparent' ? '#000000' : selectedField.backgroundColor}
                      onChange={(e) => updateField(selectedField.id, { backgroundColor: e.target.value })}
                      className="w-10 h-9 rounded-lg border border-white/10 bg-transparent cursor-pointer"
                    />
                    <button
                      onClick={() => updateField(selectedField.id, { backgroundColor: 'transparent' })}
                      className="flex-1 text-xs bg-white/5 text-slate-400 hover:bg-white/10 rounded-lg px-2"
                    >
                      Transparent
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Border Radius */}
            <div>
              <label className="text-slate-400 text-xs">Border Radius: {selectedField.borderRadius}px</label>
              <input
                type="range"
                min={0}
                max={100}
                value={selectedField.borderRadius}
                onChange={(e) => updateField(selectedField.id, { borderRadius: +e.target.value })}
                className="w-full mt-1 accent-indigo-500"
              />
            </div>

            {/* Visibility */}
            <button
              onClick={() => updateField(selectedField.id, { visible: !selectedField.visible })}
              className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-all ${
                selectedField.visible
                  ? 'bg-white/5 text-slate-400 hover:bg-white/10'
                  : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
              }`}
            >
              {selectedField.visible ? <Eye size={14} /> : <EyeOff size={14} />}
              {selectedField.visible ? 'Visible' : 'Hidden'}
            </button>
          </div>
        ) : (
          <div className="glass rounded-2xl p-6 text-center space-y-3">
            <Layers size={32} className="text-indigo-400 mx-auto opacity-50" />
            <p className="text-slate-400 text-sm">Click a field on the canvas to edit its properties</p>
          </div>
        )}
      </div>
    </div>
  );
}
