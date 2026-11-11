import { useState, type SubmitEvent } from 'react';
import { actions } from 'astro:actions';
import { toast, Toaster } from 'sonner';
import { Save } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Input, Textarea } from '../ui/input';
import { Label } from '../ui/label';
import { settingFields, settingFieldsEn, type Field } from '../../lib/content-config';
import { settingsInput } from '../../lib/validation';
import { UploadField } from './UploadField';
import type { z } from 'zod';
type Settings = z.input<typeof settingsInput>;
function Fields({ fields, settings }: { fields: Field[]; settings: Settings }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {fields.map((field) => (
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
  );
}
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
      labelEn: String(f.get(`stat-label-en-${i}`) || ''),
    })).filter((s) => s.value || s.label);
    try {
      const parsed = settingsInput.safeParse({
        ...Object.fromEntries(f),
        logo,
        favicon,
        statistics,
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
            Keep company information accurate. Fields marked * are required. Contact details left
            blank show as &ldquo;to be updated&rdquo; on the website.
          </p>
        </CardHeader>
        <CardContent>
          <Fields fields={settingFields} settings={settings} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>English version</CardTitle>
          <p className="text-sm text-muted-foreground">
            Shown on the English website (/en). Blank fields fall back to the Indonesian text.
          </p>
        </CardHeader>
        <CardContent>
          <Fields fields={settingFieldsEn} settings={settings} />
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
          <CardTitle>Company facts</CardTitle>
          <p className="text-sm text-muted-foreground">
            Up to four facts shown on the About page. Leave a row blank to omit it. Use verified
            figures only.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="grid gap-3 sm:grid-cols-[140px_1fr_1fr]">
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
              <div className="space-y-2">
                <Label htmlFor={`stat-label-en-${i}`}>English label {i + 1}</Label>
                <Input
                  id={`stat-label-en-${i}`}
                  name={`stat-label-en-${i}`}
                  defaultValue={settings.statistics[i]?.labelEn}
                  maxLength={250}
                />
              </div>
            </div>
          ))}
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
