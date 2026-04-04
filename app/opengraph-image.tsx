import { ImageResponse } from 'next/og';

export const alt =
  'AirwayLab — Flow Limitation Analysis for ResMed PAP Data';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 80px',
          background: 'linear-gradient(145deg, #0a0a0f 0%, #0f172a 50%, #0a0a0f 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Top accent line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'linear-gradient(90deg, #3b82f6, #10b981, #f59e0b, #f43f5e)',
          }}
        />

        {/* Logo + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
          {/* Moon icon circle */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'rgba(45, 184, 154, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
            }}
          >
            🌙
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <span
              style={{
                fontSize: 48,
                fontWeight: 800,
                color: '#f1f5f9',
                letterSpacing: '-0.02em',
              }}
            >
              Airway
            </span>
            <span
              style={{
                fontSize: 48,
                fontWeight: 400,
                color: '#2DB89A',
                letterSpacing: '-0.02em',
              }}
            >
              Lab
            </span>
          </div>
        </div>

        {/* Tagline */}
        <p
          style={{
            fontSize: 26,
            color: '#94a3b8',
            lineHeight: 1.5,
            marginBottom: 40,
            maxWidth: 800,
          }}
        >
          See What Your PAP Data Actually Shows
        </p>

        {/* Engine badges */}
        <div style={{ display: 'flex', gap: 16 }}>
          {[
            { label: 'Glasgow Index', color: '#3b82f6' },
            { label: 'WAT', color: '#10b981' },
            { label: 'NED', color: '#f59e0b' },
            { label: 'Oximetry', color: '#f43f5e' },
          ].map((engine) => (
            <div
              key={engine.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 18px',
                borderRadius: 9999,
                background: `${engine.color}18`,
                border: `1px solid ${engine.color}40`,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  background: engine.color,
                }}
              />
              <span style={{ fontSize: 16, fontWeight: 600, color: engine.color }}>
                {engine.label}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom: privacy + open source */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            left: 80,
            right: 80,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 16, color: '#64748b' }}>
            Free &amp; Open Source · GPL-3.0
          </span>
          <span style={{ fontSize: 16, color: '#10b981' }}>
            🔒 Your data never leaves your device
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
