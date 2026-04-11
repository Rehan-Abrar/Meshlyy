/**
 * Meshlyy Design System — The Neural Lattice
 * Exact match to the verified light theme dashboard aesthetic.
 */

export const colors = {
  // Surface hierarchy (Light mode)
  background:             '#F9F8FC',
  surface:                '#FFFFFF',
  surfaceContainerLow:    '#F4F2F7',
  surfaceContainer:       '#EAE5F0',
  surfaceContainerHigh:   '#E0D9EB',
  surfaceContainerHighest:'#FFFFFF',

  // Primary palette (vivid purple)
  primary:        '#8B5CF6',
  primaryDim:     '#7C3AED',
  primaryGradient:'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',

  // Secondary
  secondary:         '#A78BFA',
  secondaryContainer:'#C4B5FD',

  // Accent
  accent: '#D9B38C',

  // Semantic
  success: '#10B981',
  error:   '#EF4444',

  // Text
  onSurface:        '#111827',
  onSurfaceVariant: '#4B5563',
  onSurfaceLight:   '#6B7280',

  // Ghost border 
  ghostBorder: 'rgba(139, 92, 246, 0.1)',

  // Glassmorphism overlay
  glassOverlay: 'rgba(255, 255, 255, 0.85)',
};

export const gradients = {
  primary:    'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
  accent:     'linear-gradient(135deg, #D9B38C 0%, #e8c9a8 100%)',
  glowViolet: 'radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.08) 0%, transparent 65%)',
  glowBottom: 'radial-gradient(ellipse at 50% 100%, rgba(139,92,246,0.05) 0%, transparent 60%)',
};

export const shadows = {
  ambient:   '0 10px 30px rgba(0, 0, 0, 0.03)',
  card:      '0 4px 20px rgba(0, 0, 0, 0.04)',
  cardHover: '0 12px 32px rgba(139, 92, 246, 0.08)',
  glow:      '0 0 24px rgba(139, 92, 246, 0.15)',
  glowStrong:'0 0 32px rgba(139, 92, 246, 0.25)',
  button:    '0 4px 14px rgba(139, 92, 246, 0.25)',
  buttonHover:'0 6px 20px rgba(139, 92, 246, 0.4)',
};

export const typography = {
  fontHeading: "'Plus Jakarta Sans', sans-serif",
  fontBody:    "'Inter', sans-serif",
  sizes: {
    heroDisplay: '3.5rem',
    sectionHead: '1.75rem',
    titleLg:     '1.375rem',
    bodyLg:      '1rem',
    bodyMd:      '0.875rem',
    microLabel:  '0.6875rem',
  },
  weights: {
    regular:  400,
    medium:   500,
    semibold: 600,
    bold:     700,
    extrabold:800,
  },
  tracking: {
    tight:   '-0.02em',
    normal:  '0em',
    wide:    '0.05em',
  },
  leading: {
    display: 1.1,
    body:    1.5,
  },
};

export const spacing = {
  xs:  '0.5rem',
  sm:  '1rem',
  md:  '1.5rem',
  lg:  '2rem',
  xl:  '2.75rem',
  gap: '1.4rem',
};

export const radius = {
  sm: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.5rem',
  full: '9999px',
};

export const glass = {
  background: 'rgba(255, 255, 255, 0.85)',
  backdropBlur: 'blur(20px)',
  border: '1px solid rgba(139, 92, 246, 0.1)',
};

export const breakpoints = {
  sm:   '640px',
  md:   '768px',
  lg:   '1024px',
  xl:   '1280px',
  xxl:  '1440px',
};

export default {
  colors,
  gradients,
  shadows,
  typography,
  spacing,
  radius,
  glass,
  breakpoints,
};
