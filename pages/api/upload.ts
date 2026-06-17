import type { NextApiRequest, NextApiResponse } from 'next';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { connectDB } from '@/lib/mongodb';
import { Card } from '@/models/Card';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.xlsx', '.xls', '.csv'];
    const fileName = file.originalname.toLowerCase();
    const isAllowed =
      allowed.some((ext) => fileName.endsWith(ext)) ||
      file.mimetype.includes('spreadsheet') ||
      file.mimetype === 'text/csv' ||
      file.mimetype.startsWith('application/');

    if (isAllowed) {
      cb(null, true);
      return;
    }

    cb(new Error('Only Excel and CSV files are allowed.'));
  },
});

export const config = {
  api: {
    bodyParser: false,
  },
};

function runMiddleware(
  req: NextApiRequest,
  res: NextApiResponse,
  fn: Parameters<typeof upload.single>[0]
) {
  return new Promise<void>((resolve, reject) => {
    fn(req as any, res as any, (result: unknown) => {
      if (result instanceof Error) {
        reject(result);
        return;
      }
      resolve();
    });
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await runMiddleware(req, res, upload.single('file'));

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { raw: false });

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

    const originalKeys = rawData.length > 0 ? Object.keys(rawData[0] as object) : [];
    const columns = originalKeys.map((k) => ({
      original: k,
      normalized: normalizeKey(k),
      isPhoto:
        k.toLowerCase().includes('photo') ||
        k.toLowerCase().includes('image') ||
        k.toLowerCase().includes('pic'),
    }));

    await connectDB();
    await Card.deleteMany({});
    const cards = rows.map((r) => ({
      rowIndex: r.rowIndex,
      data: r.normalizedData,
      templateId: '',
    }));
    await Card.insertMany(cards);

    return res.status(200).json({
      success: true,
      totalRows: rows.length,
      columns,
      preview: rows.slice(0, 3).map((r) => r.normalizedData),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
