import { useState, type SubmitEvent } from 'react';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { createAuthClient } from 'better-auth/react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
const authClient = createAuthClient();
export default function Login() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [show, setShow] = useState(false);
  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const f = new FormData(e.currentTarget);
    try {
      const result = await authClient.signIn.email({
        email: String(f.get('email')),
        password: String(f.get('password')),
        rememberMe: false,
      });
      if (result.error) {
        setError(
          result.error.status === 429
            ? 'Too many attempts. Please try again later.'
            : 'Unable to sign in. Check your email and password.',
        );
        setBusy(false);
      } else window.location.assign('/admin');
    } catch {
      setError('Unable to connect. Please try again.');
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-6">
      {error && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          placeholder="you@company.co.id"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            required
            className="pr-12"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0"
            aria-label={show ? 'Hide password' : 'Show password'}
            onClick={() => setShow(!show)}
          >
            {show ? <EyeOff /> : <Eye />}
          </Button>
        </div>
      </div>
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? 'Signing in…' : 'Sign in'}
        <ArrowRight />
      </Button>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Access is limited to website administrators. Contact your website owner if you need help
        signing in.
      </p>
    </form>
  );
}
