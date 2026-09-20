import { useState, type SubmitEvent } from 'react';
import { actions } from 'astro:actions';
import { toast, Toaster } from 'sonner';
import { Save } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Input, Textarea } from '../ui/input';
import { Label } from '../ui/label';
import { settingFields } from '../../lib/content-config';
import { settingsInput } from '../../lib/validation';
import { UploadField } from './UploadField';
import type { z } from 'zod';
type Settings = z.infer<typeof settingsInput>;
export default function SettingsForm({ settings }: { settings: Settings }) {
  const [logo, setLogo] = useState(settings.logo);
  const [favicon, setFavicon] = useState(settings.favicon);
  const [busy, setBusy] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [faviconBusy, setFaviconBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  async function save(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSuccess(false);
    const f = new FormData(e.currentTarget);
    const statistics = Array.from({ length: 4 }, (_, i) => ({
      value: String(f.get(`stat-value-${i}`) || ''),
      label: String(f.get(`stat-label-${i}`) || ''),
    })).filter((s) => s.value || s.label);
    try {
      const parsed = settingsInput.safeParse({
        ...Object.fromEntries(f),
        logo,
        favicon,
        statistics,
        demoMode: f.get('demoMode') === 'on',
      });
      if (!parsed.success)
        throw new Error(
          parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(' · '),
        );
      const result = await actions.saveSettings(parsed.data);
      if (result.error) throw new Error(result.error.message);
      setSuccess(true);
      toast.success('Website settings saved.');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unable to save.';
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={save} className="max-w-5xl space-y-6">
      <Toaster richColors />
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-destructive">
          {error}
        </p>
      )}
      {success && (
        <p
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-900"
        >
          Settings saved. The public website now uses these values.
        </p>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Company & contact details</CardTitle>
          <p className="text-sm text-muted-foreground">
            Keep company information accurate. Fields marked * are required.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {settingFields.map((field) => (
              <div
                key={field.name}
                className={`space-y-2 ${field.type === 'textarea' ? 'md:col-span-2' : ''}`}
              >
                <Label htmlFor={field.name}>
                  {field.label}
                  {field.required ? ' *' : ''}
                </Label>
                {field.type === 'textarea' ? (
                  <Textarea
                    id={field.name}
                    name={field.name}
                    defaultValue={String(settings[field.name as keyof Settings] ?? '')}
                    required={field.required}
                  />
                ) : (
                  <Input
                    id={field.name}
                    name={field.name}
                    defaultValue={String(settings[field.name as keyof Settings] ?? '')}
                    type={field.type || 'text'}
                    required={field.required}
                  />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Brand assets</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <UploadField label="Logo" value={logo} onChange={setLogo} onBusy={setLogoBusy} />
          <UploadField
            label="Favicon"
            value={favicon}
            onChange={setFavicon}
            onBusy={setFaviconBusy}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Homepage statistics</CardTitle>
          <p className="text-sm text-muted-foreground">
            Up to four facts. Leave both fields blank to omit one. Use verified figures only.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="grid gap-3 sm:grid-cols-[140px_1fr]">
              <div className="space-y-2">
                <Label htmlFor={`stat-value-${i}`}>Value {i + 1}</Label>
                <Input
                  id={`stat-value-${i}`}
                  name={`stat-value-${i}`}
                  defaultValue={settings.statistics[i]?.value}
                  maxLength={20}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`stat-label-${i}`}>Label {i + 1}</Label>
                <Input
                  id={`stat-label-${i}`}
                  name={`stat-label-${i}`}
                  defaultValue={settings.statistics[i]?.label}
                  maxLength={250}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="demoMode"
              defaultChecked={settings.demoMode}
              className="mt-1 size-4 accent-primary"
            />
            <span>
              <strong className="block text-sm">Show demo content notices</strong>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                Keep enabled until all sample company information, projects, contacts, and client
                logos have been replaced and verified.
              </span>
            </span>
          </label>
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button type="submit" disabled={busy || logoBusy || faviconBusy}>
          <Save />
          {busy ? 'Saving…' : 'Save settings'}
        </Button>
      </div>
    </form>
  );
}
