'use client';

import { useEffect, useRef } from 'react';
import { getDriveDirectUrl } from '@/lib/drive';
import { TemplateConfig } from '@/app/page';

interface CardPreviewProps {
  template: TemplateConfig;
  data: Record<string, string>;
  scale?: number;
  forExport?: boolean;
}

export default function CardPreview({ template, data, scale = 1, forExport = false }: CardPreviewProps) {
  const { canvasWidth, canvasHeight, backgroundImage, fields } = template;

  const scaledW = canvasWidth * scale;
  const scaledH = canvasHeight * scale;

  function resolvePhotoUrl(url: string): string {
    if (!url) return `/api/placeholder-avatar?text=Photo`;
    if (url.includes('drive.google.com') || url.includes('open?id=')) {
      return getDriveDirectUrl(url);
    }
    return url;
  }

  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: scaledW,
        height: scaledH,
        borderRadius: 8 * scale,
        boxShadow: forExport ? 'none' : '0 25px 50px -12px rgba(0,0,0,0.8), 0 0 0 1px rgba(99,102,241,0.2)',
        background: backgroundImage
          ? `url(${backgroundImage}) center/cover no-repeat`
          : 'linear-gradient(135deg, #1e1e35 0%, #2d2d50 100%)',
        flexShrink: 0,
      }}
    >
      {/* Background overlay if no custom image */}
      {!backgroundImage && (
        <>
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, rgba(67,56,202,0.9) 0%, rgba(79,70,229,0.7) 50%, rgba(99,102,241,0.5) 100%)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.05) 0%, transparent 50%)',
            }}
          />
        </>
      )}

      {/* Fields */}
      {fields
        .filter((f) => f.visible)
        .map((field) => {
          const value = data[field.key] || '';
          const x = field.x * scale;
          const y = field.y * scale;
          const w = field.width * scale;
          const h = field.height * scale;
          const fs = field.fontSize * scale;
          const br = (field.borderRadius || 0) * scale;
          const pad = (field.padding || 2) * scale;

          if (field.isPhoto) {
            const photoUrl = resolvePhotoUrl(value);
            return (
              <div
                key={field.id}
                style={{
                  position: 'absolute',
                  left: x,
                  top: y,
                  width: w,
                  height: h,
                  borderRadius: br,
                  overflow: 'hidden',
                  border: `${2 * scale}px solid rgba(255,255,255,0.3)`,
                  background: '#1e1e35',
                }}
              >
                <img
                  src={photoUrl}
                  alt="Photo"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  crossOrigin="anonymous"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `/api/placeholder-avatar?text=${encodeURIComponent(data['name_correct_spelling_'] || data['name'] || 'P')}`;
                  }}
                />
              </div>
            );
          }

          let displayValue = value;
          if (field.textTransform === 'uppercase') displayValue = value.toUpperCase();
          if (field.textTransform === 'lowercase') displayValue = value.toLowerCase();
          if (field.textTransform === 'capitalize')
            displayValue = value.replace(/\b\w/g, (c) => c.toUpperCase());

          return (
            <div
              key={field.id}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                width: w,
                minHeight: h,
                fontSize: fs,
                fontWeight: field.fontWeight || '400',
                color: field.color || '#ffffff',
                textAlign: (field.align || 'left') as any,
                fontFamily: field.fontFamily || 'Inter, sans-serif',
                backgroundColor: field.backgroundColor !== 'transparent' ? field.backgroundColor : 'transparent',
                borderRadius: br,
                padding: pad,
                lineHeight: 1.3,
                wordBreak: 'break-word',
                display: 'flex',
                alignItems: 'center',
                justifyContent:
                  field.align === 'center' ? 'center' : field.align === 'right' ? 'flex-end' : 'flex-start',
              }}
            >
              <span>{displayValue || (forExport ? '' : `[${field.label}]`)}</span>
            </div>
          );
        })}
    </div>
  );
}
