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
  CircleAlert,
  CircleCheck,
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
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
  const hasSummary = collection !== 'clients';
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
    <form onSubmit={save}>
      <FieldGroup>
        {error && (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="title">
              {collection === 'clients' ? 'Client name' : 'Title'} *
            </FieldLabel>
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
          </Field>
          <Field>
            <FieldLabel htmlFor="slug">Slug *</FieldLabel>
            <Input
              id="slug"
              name="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              maxLength={160}
            />
          </Field>
        </div>
        {hasSummary && (
          <Field>
            <FieldLabel htmlFor="shortDescription">Short description</FieldLabel>
            <Input
              id="shortDescription"
              name="shortDescription"
              defaultValue={item?.shortDescription}
              maxLength={500}
            />
          </Field>
        )}
        <Field>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea
            id="description"
            name="description"
            defaultValue={item?.description}
            maxLength={10000}
          />
        </Field>
        <FieldSet className="rounded-lg border p-4">
          <FieldLegend>English version</FieldLegend>
          <FieldDescription>
            Shown on the English website (/en). Blank fields fall back to the Indonesian text.
          </FieldDescription>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="titleEn">English title</FieldLabel>
              <Input id="titleEn" name="titleEn" defaultValue={item?.titleEn} maxLength={250} />
            </Field>
            {hasSummary && (
              <Field>
                <FieldLabel htmlFor="shortDescriptionEn">English short description</FieldLabel>
                <Input
                  id="shortDescriptionEn"
                  name="shortDescriptionEn"
                  defaultValue={item?.shortDescriptionEn}
                  maxLength={500}
                />
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="descriptionEn">English description</FieldLabel>
              <Textarea
                id="descriptionEn"
                name="descriptionEn"
                defaultValue={item?.descriptionEn}
                maxLength={10000}
              />
            </Field>
          </FieldGroup>
        </FieldSet>
        {config.fields.map((field) => (
          <Field key={field.name}>
            <FieldLabel htmlFor={field.name}>
              {field.label}
              {field.required ? ' *' : ''}
            </FieldLabel>
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
                required={field.required}
                defaultValue={String(item?.[field.name as keyof ContentRecord] ?? '')}
                maxLength={500}
              />
            )}
          </Field>
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
        <div className="grid items-end gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="sortOrder">Sort order (lowest first)</FieldLabel>
            <Input
              id="sortOrder"
              name="sortOrder"
              type="number"
              min={0}
              max={100000}
              required
              defaultValue={item?.sortOrder ?? 0}
            />
          </Field>
          <Field orientation="horizontal">
            <Checkbox id="published" name="published" defaultChecked={item?.published ?? false} />
            <FieldLabel htmlFor="published">Published on website</FieldLabel>
          </Field>
        </div>
        <Field orientation="horizontal" className="justify-end border-t pt-5">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || uploading}>
            {busy ? 'Saving…' : 'Save changes'}
          </Button>
        </Field>
      </FieldGroup>
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
        <Alert role="status" className="mb-5">
          <CircleCheck />
          <AlertDescription>Changes saved successfully.</AlertDescription>
        </Alert>
      )}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-wrap gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
            <Input
              aria-label="Search records"
              placeholder={`Search ${config.label.toLowerCase()}…`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="max-w-full pl-9 sm:w-64"
            />
          </div>
          <NativeSelect
            aria-label="Filter by publication"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <NativeSelectOption value="all">All statuses</NativeSelectOption>
            <NativeSelectOption value="published">Published</NativeSelectOption>
            <NativeSelectOption value="draft">Draft</NativeSelectOption>
          </NativeSelect>
        </div>
        <Button
          onClick={() => {
            setEdit(null);
            setOpen(true);
          }}
        >
          <Plus data-icon="inline-start" />
          Add {config.singular}
        </Button>
      </div>
      <Card className="overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <span className="flex items-center gap-2">
                  <ArrowUpDown className="size-3.5" />
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
                        src={item.image || '/favicon.png'}
                        alt=""
                        className="hidden h-12 w-16 rounded-md bg-muted object-cover sm:block"
                      />
                    )}
                    <div className="flex min-w-36 flex-col items-start gap-1">
                      <Button
                        variant="link"
                        className="h-auto p-0 font-semibold whitespace-normal text-foreground"
                        onClick={() => {
                          setEdit(item);
                          setOpen(true);
                        }}
                      >
                        {item.title}
                      </Button>
                      <span className="text-xs text-muted-foreground">{item.slug}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={item.published ? 'default' : 'outline'}>
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
                      <DropdownMenuGroup>
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
                          variant="destructive"
                          onSelect={() => {
                            setRemove(item);
                            setError('');
                          }}
                        >
                          <Trash2 />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!filtered.length && (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{items.length ? 'No matching records' : 'Nothing here yet'}</EmptyTitle>
              <EmptyDescription>
                {items.length
                  ? 'Try a different search or filter.'
                  : `Add your first ${config.singular} to get started.`}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </Card>
      <p className="mt-4 text-xs text-muted-foreground">
        {filtered.length} of {items.length} records · Edit the sort order to rearrange the website.
      </p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {edit ? 'Edit' : 'Add'} {config.singular}
            </DialogTitle>
            <DialogDescription>
              Changes appear on the website when published. Fields marked * are required.
            </DialogDescription>
          </DialogHeader>
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
      <AlertDialog
        open={!!remove}
        onOpenChange={(v) => {
          if (!v && !busy) setRemove(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {config.singular}?</AlertDialogTitle>
            <AlertDialogDescription>
              “{remove?.title}” will be permanently removed. Unpublish it instead if you may need it
              later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={busy}
              onClick={(e) => {
                // Keep the dialog open until the server confirms, so errors stay visible.
                e.preventDefault();
                void deleteItem();
              }}
            >
              {busy ? 'Deleting…' : 'Delete permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
