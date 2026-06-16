import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get('fileId');

  if (!fileId) {
    return NextResponse.json({ error: 'Missing fileId' }, { status: 400 });
  }

  // Try multiple Google Drive direct download formats
  const urls = [
    `https://drive.google.com/uc?export=view&id=${fileId}`,
    `https://lh3.googleusercontent.com/d/${fileId}`,
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`,
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; IDCardCreator/1.0)',
          Accept: 'image/*',
        },
        redirect: 'follow',
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        if (contentType.includes('image')) {
          const buffer = await response.arrayBuffer();
          return new NextResponse(buffer, {
            status: 200,
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=86400',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      }
    } catch (e) {
      // try next URL
    }
  }

  // Return placeholder if all fail
  return NextResponse.redirect(
    new URL(`/api/placeholder-avatar?text=${encodeURIComponent('Photo')}`, request.url)
  );
}
