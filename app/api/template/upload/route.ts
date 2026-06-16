import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mimeType = file.type || 'image/png';
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return NextResponse.json({
      success: true,
      dataUrl,
      name: file.name,
      size: file.size,
      width: 800,
      height: 500,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
