// Adapted from ui.shadcn.com/r/styles/base-nova/use-mobile.json (MIT; see LICENSE).
import { useEffect, useState } from 'react';

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const change = () => setIsMobile(query.matches);
    query.addEventListener('change', change);
    change();
    return () => query.removeEventListener('change', change);
  }, []);
  return isMobile;
}
