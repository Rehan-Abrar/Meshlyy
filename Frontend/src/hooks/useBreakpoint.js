import { useState, useEffect } from 'react';
import { breakpoints } from '../styles/theme';

/**
 * useBreakpoint - Centralized hook for JS-side responsive behavior.
 * Standardizes on the 1024px (lg) breakpoint for layout transitions.
 */
export const useBreakpoint = () => {
  const lgValue = parseInt(breakpoints.lg); // 1024
  const [isMobile, setIsMobile] = useState(window.innerWidth < lgValue);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < lgValue);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [lgValue]);

  return { isMobile, lgValue };
};

export default useBreakpoint;
