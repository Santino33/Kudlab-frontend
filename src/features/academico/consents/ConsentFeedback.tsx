import { useEffect, useState } from 'react';
import { CircleAlert } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import './consent-feedback.css';

// Local composition of the existing shadcn Alert; no global toast queue or focus transfer.
export function ConsentFeedback({ message }: { message: string }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 6000);
    return () => clearTimeout(timer);
  }, []);
  if (!visible) return null;
  return <Alert id="consent-feedback" className="consent-feedback" aria-atomic="true">
    <CircleAlert aria-hidden="true" />
    <h3 className="min-w-0 text-base font-semibold">Revisa el consentimiento</h3>
    <AlertDescription>{message}</AlertDescription>
  </Alert>;
}
