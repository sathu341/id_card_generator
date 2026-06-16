# ID Card Creator Pro 🎴

A professional Next.js + MongoDB app to generate ID cards from Excel data with a drag-and-drop visual template builder.

## ✨ Features

- **Excel Import** — Upload `.xlsx`, `.xls`, or `.csv` files with student data
- **Visual Template Builder** — Drag fields, resize them, style with color/font/alignment
- **Google Drive Photo Support** — Automatically proxies Drive photos to fix CORS
- **Live Preview** — See exactly how each card looks with real data
- **Bulk Export** — Download all cards as PNG files in a ZIP (2× high-resolution)
- **MongoDB Persistence** — Templates and card data saved to database
- **Pro Dark UI** — Indigo/purple glass morphism design

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Edit `.env.local`:

```env
# Local MongoDB
MONGODB_URI=mongodb://localhost:27017/id-card-creator

# OR MongoDB Atlas
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/id-card-creator
```

### 3. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📋 How to Use

### Step 1 — Import Data
- Click **Import Data** tab
- Upload your Excel file (`.xlsx` / `.csv`)
- App detects columns automatically, including photo URL fields

### Step 2 — Design Template
- Click **Design** tab
- Upload a background image (your ID card template design) or use the default gradient
- **Drag fields** on the canvas to reposition
- **Drag the corner handle** to resize fields
- Use the **right panel** to style: font size, color, weight, alignment, transform
- Remove fields by dragging them off (or click 🗑️)
- Click **Auto** to regenerate fields from all columns
- Choose canvas size presets: CR80 Card, A6 Portrait, Square, Wide Card
- **Save Template** — persists to MongoDB

### Step 3 — Preview
- Navigate through all cards using Prev/Next
- Live render with actual student photos from Google Drive

### Step 4 — Export
- **Export All as ZIP** — generates all PNG cards at 2× resolution
- **Individual PNG** — download single cards
- Progress bar shows export status

---

## 📁 Project Structure

```
id-card-creator/
├── app/
│   ├── api/
│   │   ├── upload/route.ts        # Excel parsing + MongoDB save
│   │   ├── cards/route.ts         # Get all card records
│   │   ├── template/
│   │   │   ├── route.ts           # CRUD for templates
│   │   │   └── upload/route.ts    # Background image upload
│   │   ├── proxy-image/route.ts   # Google Drive CORS proxy ⭐
│   │   └── placeholder-avatar/    # Fallback avatar SVG
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                   # Main app page
├── components/
│   ├── TemplateBuilder.tsx        # Drag-and-drop canvas editor
│   ├── CardPreview.tsx            # Single card renderer
│   └── BulkExport.tsx             # Export manager
├── lib/
│   ├── mongodb.ts                 # DB connection
│   └── drive.ts                   # Google Drive URL utilities
├── models/
│   ├── Template.ts                # Mongoose schema
│   └── Card.ts                    # Card data schema
└── .env.local                     # Your config
```

---

## 🔑 Google Drive Photo Notes

The app automatically handles Google Drive photo URLs in these formats:
- `https://drive.google.com/open?id=FILE_ID`
- `https://drive.google.com/file/d/FILE_ID/view`
- `https://drive.google.com/uc?export=view&id=FILE_ID`

Photos are proxied through `/api/proxy-image?fileId=...` to avoid browser CORS blocks.

If photos are restricted (not shared publicly), they'll show as a gradient placeholder with initials.

**To make photos work:** Share files in Google Drive → "Anyone with the link can view"

---

## 🏗️ Build for Production

```bash
npm run build
npm start
```

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Database | MongoDB + Mongoose |
| Styling | Tailwind CSS |
| Excel Parsing | SheetJS (xlsx) |
| Image Export | html2canvas |
| ZIP Creation | JSZip |
| Language | TypeScript |
