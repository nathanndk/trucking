import { useId, useState } from 'react';
import { UploadCloud, X } from 'lucide-react';
import { actions } from 'astro:actions';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Dropzone } from '../ui/dropzone';
export function UploadField({
  value,
  onChange,
  folder = 'general',
  label = 'Image',
  onBusy,
}: {
  value: string;
  onChange: (path: string) => void;
  folder?: string;
  label?: string;
  onBusy?: (busy: boolean) => void;
}) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function upload(file?: File) {
    if (!file || busy) return;
    setBusy(true);
    onBusy?.(true);
    setError('');
    try {
      const form = new FormData();
      form.set('file', file);
      form.set('folder', folder);
      const result = await actions.upload(form);
      if (result.error) throw new Error(result.error.message);
      onChange(result.data.path);
      toast.success('Image uploaded. Save the form to apply it.');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Upload failed.';
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
      onBusy?.(false);
    }
  }
  return (
    <div className="space-y-3">
      <Label htmlFor={id}>{label}</Label>
      {value && (
        <div className="flex items-start gap-3">
          <img
            src={value}
            alt={`${label} preview`}
            className="h-24 w-36 rounded-md bg-muted object-contain"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={busy}
            onClick={() => onChange('')}
            aria-label={`Remove ${label.toLowerCase()}`}
          >
            <X />
          </Button>
        </div>
      )}
      <Dropzone
        inputId={id}
        accept={{ 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] }}
        maxSize={5 * 1024 * 1024}
        maxFiles={1}
        disabled={busy}
        onDrop={(files) => void upload(files[0])}
        onError={(e) => {
          setError(e.message);
          toast.error(e.message);
        }}
        className="min-w-0 border-dashed bg-muted/40 whitespace-normal break-words"
      >
        <UploadCloud size={24} />
        <span className="text-sm">
          {busy ? 'Uploading…' : 'Drop an image here, or choose a file'}
        </span>
        <span className="text-xs font-normal text-muted-foreground">
          JPEG, PNG or WebP · max 5 MB · optimized automatically
        </span>
      </Dropzone>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
