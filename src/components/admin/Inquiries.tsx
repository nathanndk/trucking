import { useState } from 'react';
import { actions } from 'astro:actions';
import { toast, Toaster } from 'sonner';
import { CircleAlert } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { inquiries } from '../../db/schema';
type Inquiry = typeof inquiries.$inferSelect;
const statuses = ['new', 'contacted', 'quoted', 'closed'] as const;
export default function Inquiries({ items }: { items: Inquiry[] }) {
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [status, setStatus] = useState<Inquiry['status']>('new');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const filtered = items.filter(
    (i) =>
      (filter === 'all' || i.status === filter) &&
      `${i.fullName} ${i.company} ${i.pickup} ${i.destination}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  async function save() {
    if (!selected) return;
    setBusy(true);
    setError('');
    const result = await actions.inquiryStatus({ id: selected.id, status });
    if (result.error) {
      setError(result.error.message);
      toast.error(result.error.message);
      setBusy(false);
    } else window.location.assign('/admin/inquiries?saved=1');
  }
  return (
    <>
      <Toaster richColors />
      <div className="mb-6 flex flex-wrap gap-3">
        <Input
          aria-label="Search inquiries"
          placeholder="Search name, company or route…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="sm:max-w-sm"
        />
        <NativeSelect
          aria-label="Filter inquiry status"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <NativeSelectOption value="all">All statuses</NativeSelectOption>
          {statuses.map((s) => (
            <NativeSelectOption key={s} value={s}>
              {s}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <Card className="overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contact</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Received</TableHead>
              <TableHead>
                <span className="sr-only">View</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <p className="min-w-32 font-semibold">{item.fullName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.company}</p>
                </TableCell>
                <TableCell>
                  <p className="min-w-32">
                    {item.pickup} → {item.destination}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[item.serviceType, item.containerType].filter(Boolean).join(', ')}
                  </p>
                </TableCell>
                <TableCell>
                  <Badge variant={item.status === 'new' ? 'default' : 'secondary'}>
                    {item.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="whitespace-nowrap text-xs">
                    {new Date(item.createdAt).toLocaleDateString('en-GB', {
                      timeZone: 'Asia/Jakarta',
                    })}
                  </span>
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelected(item);
                      setStatus(item.status);
                      setError('');
                    }}
                  >
                    View inquiry
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!filtered.length && (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No inquiries found</EmptyTitle>
              <EmptyDescription>New quotation requests will appear here.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </Card>
      <p className="mt-4 text-xs text-muted-foreground">
        {filtered.length} inquiries · Private to administrators
      </p>
      <Dialog
        open={!!selected}
        onOpenChange={(v) => {
          if (!v) setSelected(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Quotation request #{selected?.id}</DialogTitle>
            <DialogDescription>
              Review the request and record your follow-up status.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <>
              <dl className="grid gap-5 sm:grid-cols-2">
                {[
                  ['Full name', selected.fullName],
                  ['Company', selected.company],
                  ['WhatsApp / phone', selected.phone],
                  ['Email', selected.email],
                  ['Service needed', selected.serviceType || 'Not specified'],
                  ['Container type', selected.containerType || 'Not specified'],
                  ['Origin', selected.pickup],
                  ['Destination', selected.destination],
                  // Requests sent through the earlier form carry these legacy details.
                  ...(selected.cargo ? [['Cargo', selected.cargo]] : []),
                  ...(selected.weight ? [['Weight', selected.weight]] : []),
                  ...(selected.vehicle ? [['Preferred vehicle', selected.vehicle]] : []),
                  [
                    'Received',
                    new Date(selected.createdAt).toLocaleString('en-GB', {
                      timeZone: 'Asia/Jakarta',
                    }),
                  ],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="mt-1 break-words text-sm font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
              <div>
                <h3 className="text-xs text-muted-foreground">Message</h3>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {selected.message || 'No additional message.'}
                </p>
              </div>
              <Separator />
              <Field>
                <FieldLabel htmlFor="status">Inquiry status</FieldLabel>
                <NativeSelect
                  id="status"
                  className="w-full"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Inquiry['status'])}
                >
                  {statuses.map((s) => (
                    <NativeSelectOption key={s} value={s}>
                      {s}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              {error && (
                <Alert variant="destructive">
                  <CircleAlert />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <DialogFooter>
                <Button disabled={busy} onClick={() => void save()}>
                  {busy ? 'Saving…' : 'Update status'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
