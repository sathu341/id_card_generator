'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Upload, Settings, Eye, Download, Layers, ChevronRight,
  Sparkles, Database, Image, FileSpreadsheet, Save, Plus,
  Trash2, RefreshCw, Check, AlertCircle, LayoutTemplate
} from 'lucide-react';
import TemplateBuilder from '@/components/TemplateBuilder';
import CardPreview from '@/components/CardPreview';
import BulkExport from '@/components/BulkExport';

type Tab = 'upload' | 'design' | 'preview' | 'export';

interface Column {
  original: string;
  normalized: string;
  isPhoto: boolean;
}

interface CardData {
  _id: string;
  rowIndex: number;
  data: Record<string, string>;
}

export interface FieldConfig {
  id: string;
  key: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontWeight: string;
  color: string;
  align: string;
  visible: boolean;
  isPhoto: boolean;
  fontFamily: string;
  textTransform: string;
  backgroundColor: string;
  borderRadius: number;
  padding: number;
}

export interface TemplateConfig {
  _id?: string;
  name: string;
  backgroundImage: string;
  backgroundImageName: string;
  canvasWidth: number;
  canvasHeight: number;
  fields: FieldConfig[];
}

const DEFAULT_CANVAS = { width: 400, height: 250 };

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('upload');
  const [columns, setColumns] = useState<Column[]>([]);
  const [cards, setCards] = useState<CardData[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [uploadMsg, setUploadMsg] = useState('');
  const [template, setTemplate] = useState<TemplateConfig>({
    name: 'My ID Card',
    backgroundImage: '',
    backgroundImageName: '',
    canvasWidth: DEFAULT_CANVAS.width,
    canvasHeight: DEFAULT_CANVAS.height,
    fields: [],
  });
  const [savedTemplateId, setSavedTemplateId] = useState<string | undefined>();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [previewIndex, setPreviewIndex] = useState(0);
  const excelRef = useRef<HTMLInputElement>(null);
  const templateImgRef = useRef<HTMLInputElement>(null);
  const [templateUploadStatus, setTemplateUploadStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  useEffect(() => {
    // Load existing cards and template on mount
    loadCards();
    loadTemplate();
  }, []);

  async function loadCards() {
    const res = await fetch('/api/cards');
    const data = await res.json();
    if (data.cards?.length > 0) {
      setCards(data.cards);
      setTotalRows(data.cards.length);
      // Infer columns from first card
      const firstCard = data.cards[0];
      const cols: Column[] = Object.keys(firstCard.data).map((k) => ({
        original: k,
        normalized: k,
        isPhoto: k.includes('photo') || k.includes('image') || k.includes('pic'),
      }));
      setColumns(cols);
    }
  }

  async function loadTemplate() {
    const res = await fetch('/api/template');
    const data = await res.json();
    if (data.templates?.length > 0) {
      const t = data.templates[0];
      setTemplate({
        _id: t._id,
        name: t.name,
        backgroundImage: t.backgroundImage,
        backgroundImageName: t.backgroundImageName,
        canvasWidth: t.canvasWidth,
        canvasHeight: t.canvasHeight,
        fields: t.fields,
      });
      setSavedTemplateId(t._id);
    }
  }

  async function handleExcelUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus('loading');
    setUploadMsg('Parsing Excel file...');

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();

    if (data.success) {
      setColumns(data.columns);
      setTotalRows(data.totalRows);
      setUploadStatus('success');
      setUploadMsg(`✓ ${data.totalRows} records loaded from "${file.name}"`);
      await loadCards();

      // Auto-generate fields from columns if template has none
      if (template.fields.length === 0) {
        generateDefaultFields(data.columns);
      }
    } else {
      setUploadStatus('error');
      setUploadMsg(data.error || 'Upload failed');
    }
  }
  async function handleTemplateImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setTemplateUploadStatus('loading');
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
      setTemplateUploadStatus('success');
    } else {
      setTemplateUploadStatus('idle');
    }
    // reset so same file can be re-selected
    e.target.value = '';
  }

  function generateDefaultFields(cols: Column[]) {
    function isNameField(key: string, label: string) {
      const lower = (key + ' ' + label).toLowerCase();
      return lower.includes('name') && !lower.includes('father') && !lower.includes('mother') && !lower.includes('parent');
    }
    const fields: FieldConfig[] = cols.map((col, i) => {
      const label = col.original
        .replace(/\s*\(.*?\)\s*/g, '')
        .trim()
        .split(' ')
        .slice(0, 3)
        .join(' ');
      const isName = !col.isPhoto && isNameField(col.normalized, label);
      const fontSize = col.isPhoto ? 12 : isName ? 40 : 14;
      return {
        id: `field_${col.normalized}_${Date.now()}_${i}`,
        key: col.normalized,
        label,
        x: 10,
        y: 10 + i * 50,
        width: col.isPhoto ? 80 : isName ? 280 : 200,
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

  async function saveTemplate() {
    setSaveStatus('saving');
    const payload = savedTemplateId
      ? { ...template, _id: savedTemplateId }
      : template;

    const res = await fetch('/api/template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      setSavedTemplateId(data.template._id);
      setTemplate((prev) => ({ ...prev, _id: data.template._id }));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'upload', label: 'Import Data', icon: <FileSpreadsheet size={18} />, desc: 'Upload Excel' },
    { id: 'design', label: 'Design', icon: <LayoutTemplate size={18} />, desc: 'Build template' },
    { id: 'preview', label: 'Preview', icon: <Eye size={18} />, desc: 'Review cards' },
    { id: 'export', label: 'Export', icon: <Download size={18} />, desc: 'Download all' },
  ];

  const canProceed = {
    upload: true,
    design: columns.length > 0 || totalRows > 0,
    preview: template.fields.length > 0,
    export: template.fields.length > 0 && totalRows > 0,
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #0f0f1a 0%, #161625 50%, #0f0f1a 100%)' }}>
      {/* Header */}
      <header className="glass border-b border-indigo-500/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center glow">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-none">ID Card Creator</h1>
              <p className="text-xs text-indigo-300/70 leading-none mt-0.5">Pro Edition</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {totalRows > 0 && (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-1.5">
                <Database size={13} className="text-emerald-400" />
                <span className="text-xs text-emerald-300 font-medium">{totalRows} records</span>
              </div>
            )}
            {template.fields.length > 0 && (
              <button
                onClick={saveTemplate}
                disabled={saveStatus === 'saving'}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
              >
                {saveStatus === 'saving' ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : saveStatus === 'saved' ? (
                  <Check size={13} className="text-emerald-300" />
                ) : (
                  <Save size={13} />
                )}
                {saveStatus === 'saved' ? 'Saved!' : 'Save Template'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Tab Nav */}
      <div className="border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 py-2">
            {tabs.map((tab, i) => (
              <button
                key={tab.id}
                onClick={() => canProceed[tab.id] && setActiveTab(tab.id)}
                disabled={!canProceed[tab.id]}
                className={`relative flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white'
                    : canProceed[tab.id]
                    ? 'text-slate-400 hover:text-white hover:bg-white/5'
                    : 'text-slate-600 cursor-not-allowed'
                }`}
              >
                <span className="flex items-center gap-2">
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </span>
                {i < tabs.length - 1 && activeTab !== tab.id && canProceed[tab.id] && (
                  <ChevronRight size={14} className="text-slate-500 hidden sm:block" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {/* UPLOAD TAB */}
        {activeTab === 'upload' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Import Student Data</h2>
              <p className="text-slate-400 text-sm">Upload your Excel file with student information to generate ID cards</p>
            </div>

            {/* Upload Zone */}
            <div
              onClick={() => excelRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
                uploadStatus === 'success'
                  ? 'border-emerald-500/50 bg-emerald-500/5'
                  : uploadStatus === 'error'
                  ? 'border-red-500/50 bg-red-500/5'
                  : 'border-indigo-500/30 bg-indigo-500/5 hover:border-indigo-400/60 hover:bg-indigo-500/10'
              }`}
            >
              <input
                ref={excelRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleExcelUpload}
              />
              {uploadStatus === 'loading' ? (
                <div className="space-y-3">
                  <RefreshCw size={40} className="mx-auto text-indigo-400 animate-spin" />
                  <p className="text-indigo-300 font-medium">{uploadMsg}</p>
                </div>
              ) : uploadStatus === 'success' ? (
                <div className="space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                    <Check size={32} className="text-emerald-400" />
                  </div>
                  <p className="text-emerald-300 font-semibold text-lg">{uploadMsg}</p>
                  <p className="text-slate-400 text-sm">Click to upload a different file</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-500/20 flex items-center justify-center">
                    <FileSpreadsheet size={32} className="text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-lg">Drop Excel file here</p>
                    <p className="text-slate-400 text-sm mt-1">or click to browse — .xlsx, .xls, .csv supported</p>
                  </div>
                </div>
              )}
            </div>

            {/* Column Preview */}
            {columns.length > 0 && (
              <div className="glass rounded-2xl p-6 space-y-4">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Database size={16} className="text-indigo-400" />
                  Detected Fields ({columns.length})
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {columns.map((col) => (
                    <div
                      key={col.normalized}
                      className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-2.5"
                    >
                      <div className="flex items-center gap-3">
                        {col.isPhoto ? (
                          <Image size={14} className="text-purple-400" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-sm bg-indigo-500/40 border border-indigo-400/50" />
                        )}
                        <span className="text-white text-sm font-medium">{col.normalized}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-xs truncate max-w-[180px]">{col.original}</span>
                        {col.isPhoto && (
                          <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">
                            Photo
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setActiveTab('design')}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  Continue to Design
                  <ChevronRight size={18} />
                </button>
              </div>
            )}

            {/* Info box about Google Drive */}
            <div className="flex gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
              <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-200/80">
                <strong className="text-amber-300">Google Drive Photos:</strong> Photos from Google Drive URLs are automatically proxied to bypass CORS restrictions. Photos will render correctly in previews and exports.
              </div>
            </div>
          </div>
        )}

        {/* DESIGN TAB */}
        {activeTab === 'design' && (
          <TemplateBuilder
            template={template}
            setTemplate={setTemplate}
            columns={columns}
            sampleData={cards[0]?.data || {}}
            onSave={saveTemplate}
            saveStatus={saveStatus}
          />
        )}

        {/* PREVIEW TAB */}
        {activeTab === 'preview' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Card Preview</h2>
                <p className="text-slate-400 text-sm mt-1">{totalRows} cards ready to generate</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  disabled={previewIndex === 0}
                  onClick={() => setPreviewIndex((p) => p - 1)}
                  className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg text-sm disabled:opacity-30"
                >
                  ← Prev
                </button>
                <span className="text-slate-400 text-sm">{previewIndex + 1} / {Math.max(totalRows, 1)}</span>
                <button
                  disabled={previewIndex >= totalRows - 1}
                  onClick={() => setPreviewIndex((p) => p + 1)}
                  className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg text-sm disabled:opacity-30"
                >
                  Next →
                </button>
              </div>
            </div>

            <div className="flex justify-center">
              {cards[previewIndex] ? (
                <CardPreview
                  template={template}
                  data={cards[previewIndex].data}
                  scale={1.5}
                />
              ) : (
                <div className="glass rounded-2xl p-12 text-center">
                  <p className="text-slate-400">No data loaded yet. Please upload an Excel file first.</p>
                </div>
              )}
            </div>

            <div className="flex justify-center">
              <button
                onClick={() => setActiveTab('export')}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3 rounded-xl transition-all flex items-center gap-2"
              >
                <Download size={18} />
                Export All Cards
              </button>
            </div>
          </div>
        )}

        {/* EXPORT TAB */}
        {activeTab === 'export' && (
          <BulkExport template={template} cards={cards} totalRows={totalRows} />
        )}
      </main>
    </div>
  );
}
