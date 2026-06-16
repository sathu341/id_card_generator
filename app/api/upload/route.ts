import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { connectDB } from '@/lib/mongodb';
import { Card } from '@/models/Card';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { raw: false });

    // Normalize column keys
    const normalizeKey = (key: string) =>
      key
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

    const rows = rawData.map((row: any, index: number) => {
      const normalized: Record<string, string> = {};
      for (const [k, v] of Object.entries(row)) {
        normalized[normalizeKey(k)] = String(v ?? '');
      }
      return { rowIndex: index, originalData: row, normalizedData: normalized };
    });

    // Get column definitions
    const originalKeys = rawData.length > 0 ? Object.keys(rawData[0] as object) : [];
    const columns = originalKeys.map((k) => ({
      original: k,
      normalized: normalizeKey(k),
      isPhoto:
        k.toLowerCase().includes('photo') ||
        k.toLowerCase().includes('image') ||
        k.toLowerCase().includes('pic'),
    }));

    // Save to MongoDB
    await connectDB();
    await Card.deleteMany({});
    const cards = rows.map((r) => ({
      rowIndex: r.rowIndex,
      data: r.normalizedData,
      templateId: '',
    }));
    await Card.insertMany(cards);

    return NextResponse.json({
      success: true,
      totalRows: rows.length,
      columns,
      preview: rows.slice(0, 3).map((r) => r.normalizedData),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    await connectDB();
    const cards = await Card.find({}).sort({ rowIndex: 1 }).lean();
    return NextResponse.json({ cards });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
