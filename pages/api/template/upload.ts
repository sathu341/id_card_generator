import type { NextApiRequest, NextApiResponse } from 'next';
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
      return;
    }

    cb(new Error('Only image files are allowed.'));
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

    const base64 = Buffer.from(file.buffer).toString('base64');
    const mimeType = file.mimetype || 'image/png';
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return res.status(200).json({
      success: true,
      dataUrl,
      name: file.originalname,
      size: file.size,
      width: 800,
      height: 500,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
