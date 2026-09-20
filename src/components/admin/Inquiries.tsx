import { useState } from 'react';
import { actions } from 'astro:actions';
import { toast, Toaster } from 'sonner';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
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
        <select
          aria-label="Filter inquiry status"
          className="admin-select !w-auto"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <Card className="overflow-hidden">
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
                    {item.cargo} · {item.weight}
                  </p>
                </TableCell>
                <TableCell>
                  <Badge
                    className={
                      item.status === 'new'
                        ? 'border-green-200 bg-green-50 text-green-800'
                        : 'bg-muted'
                    }
                  >
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
          <div className="p-12 text-center">
            <p className="font-semibold">No inquiries found</p>
            <p className="mt-2 text-sm text-muted-foreground">
              New quotation requests will appear here.
            </p>
          </div>
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
        <DialogContent>
          <div>
            <DialogTitle className="text-xl font-semibold">
              Quotation request #{selected?.id}
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm text-muted-foreground">
              Review the request and record your follow-up status.
            </DialogDescription>
          </div>
          {selected && (
            <>
              <dl className="grid gap-5 sm:grid-cols-2">
                {[
                  ['Full name', selected.fullName],
                  ['Company', selected.company],
                  ['WhatsApp / phone', selected.phone],
                  ['Email', selected.email],
                  ['Pickup', selected.pickup],
                  ['Destination', selected.destination],
                  ['Cargo', selected.cargo],
                  ['Weight', selected.weight],
                  ['Preferred vehicle', selected.vehicle || 'Please advise'],
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
              <div className="space-y-2 border-t pt-5">
                <Label htmlFor="status">Inquiry status</Label>
                <select
                  id="status"
                  className="admin-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Inquiry['status'])}
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              {error && (
                <p role="alert" className="text-destructive">
                  {error}
                </p>
              )}
              <div className="flex justify-end">
                <Button disabled={busy} onClick={() => void save()}>
                  {busy ? 'Saving…' : 'Update status'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
