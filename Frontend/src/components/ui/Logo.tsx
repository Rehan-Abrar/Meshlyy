import type { CSSProperties } from 'react'

interface LogoProps {
  size?: number
  className?: string
  style?: CSSProperties
  color?: string
}

export default function Logo({ size = 28, className, style, color }: LogoProps) {
  return (
    <img
      src="/logo.png"
      alt="Meshlyy"
      width={size}
      height={size}
      className={className}
      style={{
        display: 'block',
        objectFit: 'contain',
        filter: color === '#2D1B69'
          ? 'brightness(0) saturate(100%) invert(12%) sepia(62%) saturate(2000%) hue-rotate(247deg) brightness(80%)'
          : 'brightness(0) invert(1)',
        ...style,
      }}
    />
  )
}
