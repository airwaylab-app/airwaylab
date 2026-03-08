import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f172a',
          borderRadius: 36,
        }}
      >
        <svg
          width="120"
          height="120"
          viewBox="0 0 32 32"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M22 10a8 8 0 1 1-8 12 6.5 6.5 0 0 0 8-12Z" fill="#6366f1" />
          <circle cx="20" cy="8" r="1" fill="#6366f1" opacity="0.6" />
          <circle cx="24" cy="12" r="0.7" fill="#6366f1" opacity="0.4" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
