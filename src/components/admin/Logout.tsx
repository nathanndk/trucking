import { useState } from 'react';
import { createAuthClient } from 'better-auth/react';
import { LogOut } from 'lucide-react';
import { Button } from '../ui/button';
const authClient = createAuthClient();
export default function Logout() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(false);
          try {
            const r = await authClient.signOut();
            if (r.error) throw new Error();
            window.location.assign('/admin/login');
          } catch {
            setError(true);
            setBusy(false);
          }
        }}
      >
        <LogOut />
        {busy ? 'Signing out…' : 'Sign out'}
      </Button>
      {error && (
        <span role="alert" className="block text-xs text-destructive">
          Sign out failed. Try again.
        </span>
      )}
    </div>
  );
}
