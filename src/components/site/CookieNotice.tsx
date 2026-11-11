import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

const storageKey = 'cookie-notice';

/**
 * The cookie notice. The site only sets the language cookie, which needs no consent, so this
 * informs rather than asks: one sentence, a link to the privacy policy and a button to close it.
 * It renders after load, only for visitors who have not closed it, and appears without motion.
 */
export default function CookieNotice({
  href,
  labels,
}: {
  href: string;
  labels: { name: string; text: string; link: string; accept: string };
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      setOpen(localStorage.getItem(storageKey) !== '1');
    } catch {
      setOpen(true);
    }
  }, []);
  if (!open) return null;
  const close = () => {
    try {
      localStorage.setItem(storageKey, '1');
    } catch {
      /* storage blocked: the notice returns on the next page */
    }
    setOpen(false);
  };
  return (
    <aside
      aria-label={labels.name}
      className="fixed inset-x-4 bottom-4 z-40 flex flex-wrap items-center gap-x-4 gap-y-3 border bg-background p-4 text-sm text-foreground shadow-lg sm:left-auto sm:max-w-md"
    >
      <p className="min-w-0 flex-1 basis-64">
        {labels.text}{' '}
        <a href={href} className="underline underline-offset-4">
          {labels.link}
        </a>
      </p>
      <Button type="button" size="sm" onClick={close}>
        {labels.accept}
      </Button>
    </aside>
  );
}
