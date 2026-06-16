import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get('text') || 'Photo';
  const size = parseInt(searchParams.get('size') || '200');

  const initials = text
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#1e1e35"/>
  <rect width="${size}" height="${size}" fill="url(#grad)"/>
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4338ca;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#6366f1;stop-opacity:1" />
    </linearGradient>
  </defs>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
    font-family="Arial, sans-serif" font-size="${size * 0.35}" font-weight="700" fill="white">
    ${initials}
  </text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
