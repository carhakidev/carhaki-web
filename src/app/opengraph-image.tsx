import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'CarHaki - Know the truth about any imported car'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div style={{
        background: '#2563EB',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '48px',
        padding: '80px',
      }}>
        <svg width="180" height="180" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L3 7v6c0 5 3.9 9.7 9 10.9C17.1 22.7 21 18 21 13V7L12 2z"
            stroke="white" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ color: 'white', fontSize: '96px', fontWeight: 700, lineHeight: 1 }}>CarHaki</div>
          <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '36px', fontWeight: 400 }}>Know the truth about any imported car</div>
        </div>
      </div>
    ),
    { ...size }
  )
}
