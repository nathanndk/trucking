import { useState, type SubmitEvent } from 'react';
import { actions } from 'astro:actions';
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  ArrowUpDown,
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { Button } from '../ui/button';
import { Input, Textarea } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../ui/dropdown-menu';
import { contentConfig, type Collection, type ContentRecord } from '../../lib/content-config';
import { contentInput } from '../../lib/validation';
import { UploadField } from './UploadField';
function Editor({
  collection,
  item,
  onClose,
}: {
  collection: Collection;
  item: ContentRecord | null;
  onClose: () => void;
}) {
  const config = contentConfig[collection];
  const [image, setImage] = useState(item?.image || '');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [slug, setSlug] = useState(item?.slug || '');
  async function save(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const raw: Record<string, unknown> = {
      ...Object.fromEntries(form),
      collection,
      id: item?.id,
      image,
      published: form.get('published') === 'on',
      sortOrder: Number(form.get('sortOrder')),
    };
    for (const name of ['latitude', 'longitude'])
      if (form.has(name)) raw[name] = form.get(name) === '' ? null : Number(form.get(name));
    try {
      const parsed = contentInput.safeParse(raw);
      if (!parsed.success)
        throw new Error(
          parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(' · '),
        );
      const result = await actions.saveContent(parsed.data);
      if (result.error) throw new Error(result.error.message);
      onClose();
      window.location.assign(`/admin/${collection}?saved=1`);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unable to save.';
      setError(message);
      toast.error(message);
      setBusy(false);
    }
  }
  return (
    <form onSubmit={save} className="space-y-6">
      {error && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">
            {collection === 'coverage'
              ? 'City'
              : collection === 'clients'
                ? 'Client name'
                : collection === 'fleet'
                  ? 'Vehicle name'
                  : 'Title'}{' '}
            *
          </Label>
          <Input
            id="title"
            name="title"
            defaultValue={item?.title}
            required
            maxLength={250}
            onChange={(e) => {
              if (!item)
                setSlug(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, ''),
                );
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug *</Label>
          <Input
            id="slug"
            name="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            maxLength={160}
          />
        </div>
      </div>
      {collection !== 'coverage' && collection !== 'clients' && (
        <div className="space-y-2">
          <Label htmlFor="shortDescription">Short description</Label>
          <Input
            id="shortDescription"
            name="shortDescription"
            defaultValue={item?.shortDescription}
            maxLength={500}
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={item?.description}
          maxLength={10000}
        />
      </div>
      {config.fields.map((field) => (
        <div className="space-y-2" key={field.name}>
          <Label htmlFor={field.name}>
            {field.label}
            {field.required ? ' *' : ''}
          </Label>
          {field.type === 'textarea' ? (
            <Textarea
              id={field.name}
              name={field.name}
              defaultValue={String(item?.[field.name as keyof ContentRecord] ?? '')}
              maxLength={5000}
            />
          ) : (
            <Input
              id={field.name}
              name={field.name}
              type={field.type || 'text'}
              step={field.type === 'number' ? 'any' : undefined}
              required={field.required}
              defaultValue={String(
                item?.[field.name as keyof ContentRecord] ?? (field.name === 'icon' ? 'Truck' : ''),
              )}
              maxLength={500}
            />
          )}
        </div>
      ))}
      {config.image && (
        <UploadField
          label={collection === 'clients' ? 'Logo' : 'Image'}
          value={image}
          onChange={setImage}
          folder={collection}
          onBusy={setUploading}
        />
      )}
      <div className="grid items-center gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sortOrder">Sort order (lowest first)</Label>
          <Input
            id="sortOrder"
            name="sortOrder"
            type="number"
            min={0}
            max={100000}
            required
            defaultValue={item?.sortOrder ?? 0}
          />
        </div>
        <label className="flex items-center gap-3 text-sm font-medium">
          <input
            name="published"
            type="checkbox"
            defaultChecked={item?.published ?? false}
            className="size-4 accent-primary"
          />
          Published on website
        </label>
      </div>
      <div className="flex justify-end gap-3 border-t pt-5">
        <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy || uploading}>
          {busy ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
export default function ContentManager({
  collection,
  items,
  saved = false,
}: {
  collection: Collection;
  items: ContentRecord[];
  saved?: boolean;
}) {
  const config = contentConfig[collection];
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [edit, setEdit] = useState<ContentRecord | null>(null);
  const [open, setOpen] = useState(false);
  const [remove, setRemove] = useState<ContentRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const filtered = items.filter(
    (i) =>
      i.title.toLowerCase().includes(query.toLowerCase()) &&
      (filter === 'all' || i.published === (filter === 'published')),
  );
  async function publish(item: ContentRecord) {
    setBusy(true);
    const result = await actions.publishContent({
      collection,
      id: item.id,
      published: !item.published,
    });
    if (result.error) {
      toast.error(result.error.message);
      setBusy(false);
    } else window.location.assign(`/admin/${collection}?saved=1`);
  }
  async function deleteItem() {
    if (!remove) return;
    setBusy(true);
    setError('');
    const result = await actions.deleteContent({ collection, id: remove.id });
    if (result.error) {
      setError(result.error.message);
      setBusy(false);
    } else window.location.assign(`/admin/${collection}?saved=1`);
  }
  return (
    <>
      <Toaster richColors position="top-right" />
      {saved && (
        <p
          role="status"
          className="mb-5 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900"
        >
          Changes saved successfully.
        </p>
      )}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-wrap gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3.5 text-muted-foreground" />
            <Input
              aria-label="Search records"
              placeholder={`Search ${config.label.toLowerCase()}…`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="max-w-full pl-9 sm:w-64"
            />
          </div>
          <select
            className="admin-select !w-auto"
            aria-label="Filter by publication"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
        <Button
          onClick={() => {
            setEdit(null);
            setOpen(true);
          }}
        >
          <Plus />
          Add {config.singular}
        </Button>
      </div>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{collection === 'coverage' ? 'City' : 'Name'}</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <span className="flex items-center gap-2">
                  <ArrowUpDown size={14} />
                  Order
                </span>
              </TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {config.image && (
                      <img
                        src={item.image || '/favicon.svg'}
                        alt=""
                        className="hidden h-12 w-16 rounded-md bg-muted object-cover sm:block"
                      />
                    )}
                    <div className="min-w-36">
                      <button
                        className="text-left font-semibold hover:underline"
                        onClick={() => {
                          setEdit(item);
                          setOpen(true);
                        }}
                      >
                        {item.title}
                      </button>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {collection === 'coverage' ? item.province : item.slug}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    className={
                      item.published
                        ? 'border-green-200 bg-green-50 text-green-800'
                        : 'bg-muted text-muted-foreground'
                    }
                  >
                    {item.published ? 'Published' : 'Draft'}
                  </Badge>
                </TableCell>
                <TableCell>{item.sortOrder}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Actions for ${item.title}`}
                        disabled={busy}
                      >
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={() => {
                          setEdit(item);
                          setOpen(true);
                        }}
                      >
                        <Pencil />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => void publish(item)}>
                        {item.published ? <EyeOff /> : <Eye />}
                        {item.published ? 'Unpublish' : 'Publish'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onSelect={() => {
                          setRemove(item);
                          setError('');
                        }}
                      >
                        <Trash2 />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!filtered.length && (
          <div className="p-12 text-center">
            <p className="font-semibold">
              {items.length ? 'No matching records' : 'Nothing here yet'}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {items.length
                ? 'Try a different search or filter.'
                : `Add your first ${config.singular} to get started.`}
            </p>
          </div>
        )}
      </Card>
      <p className="mt-4 text-xs text-muted-foreground">
        {filtered.length} of {items.length} records · Edit the sort order to rearrange the website.
      </p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <div className="pr-6">
            <DialogTitle className="text-xl font-semibold">
              {edit ? 'Edit' : 'Add'} {config.singular}
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm text-muted-foreground">
              Changes appear on the website when published. Fields marked * are required.
            </DialogDescription>
          </div>
          {open && (
            <Editor
              key={edit?.id ?? 'new'}
              collection={collection}
              item={edit}
              onClose={() => setOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!remove}
        onOpenChange={(v) => {
          if (!v && !busy) setRemove(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogTitle className="text-xl font-semibold">Delete {config.singular}?</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            “{remove?.title}” will be permanently removed. Unpublish it instead if you may need it
            later.
          </DialogDescription>
          {error && (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setRemove(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void deleteItem()} disabled={busy}>
              {busy ? 'Deleting…' : 'Delete permanently'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
