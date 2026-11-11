import { useState, type SubmitEvent } from 'react';
import { ArrowRight, CircleAlert, Eye, EyeOff } from 'lucide-react';
import { createAuthClient } from 'better-auth/react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
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
    // method="post": if the script has not loaded yet, a submit must never put the
    // password in the address bar (the browser default for a form is GET).
    <form onSubmit={submit} method="post">
      <FieldGroup>
        {error && (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Field>
          <FieldLabel htmlFor="email">Email address</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            placeholder="you@company.co.id"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              required
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-0 right-0"
              aria-label={show ? 'Hide password' : 'Show password'}
              onClick={() => setShow(!show)}
            >
              {show ? <EyeOff /> : <Eye />}
            </Button>
          </div>
        </Field>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? 'Signing in…' : 'Sign in'}
          <ArrowRight data-icon="inline-end" />
        </Button>
        <FieldDescription>
          Access is limited to website administrators. Contact your website owner if you need help
          signing in.
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}
