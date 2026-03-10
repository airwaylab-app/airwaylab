/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from 'next/og';

export const alt =
  'AirwayLab — See If Your Sleep Therapy Is Actually Working';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#FBF7F0',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Teal accent line at top */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: '#1B7A6E',
          }}
        />

        {/* Wordmark */}
        <div style={{ display: 'flex', fontSize: 64 }}>
          <span style={{ fontWeight: 700, color: '#1A2B3D' }}>Airway</span>
          <span style={{ fontWeight: 400, color: '#1B7A6E' }}>Lab</span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: '#6B6560',
            marginTop: 24,
            maxWidth: 700,
            textAlign: 'center',
          }}
        >
          See If Your Sleep Therapy Is Actually Working
        </div>

        {/* Privacy note */}
        <div
          style={{
            fontSize: 16,
            color: '#1B7A6E',
            marginTop: 32,
          }}
        >
          Free &amp; open source — 100% in-browser analysis
        </div>
      </div>
    ),
    { ...size }
  );
}
