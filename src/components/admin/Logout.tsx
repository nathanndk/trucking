import { useState } from 'react';
import { createAuthClient } from 'better-auth/react';
import { LogOut } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { Button } from '@/components/ui/button';
const authClient = createAuthClient();
export default function Logout() {
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Toaster richColors />
      <Button
        variant="ghost"
        size="sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await authClient.signOut();
            if (r.error) throw new Error();
            window.location.assign('/admin/login');
          } catch {
            toast.error('Sign out failed. Try again.');
            setBusy(false);
          }
        }}
      >
        <LogOut data-icon="inline-start" />
        {busy ? 'Signing out…' : 'Sign out'}
      </Button>
    </>
  );
}
