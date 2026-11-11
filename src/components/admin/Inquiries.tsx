import { useState, type ReactNode } from 'react';
import { actions } from 'astro:actions';
import { CircleAlert, Eye, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import {
  KanbanBoard,
  KanbanCard,
  KanbanCards,
  KanbanHeader,
  KanbanProvider,
} from '@/components/kibo-ui/kanban';
import { Pill } from '@/components/kibo-ui/pill';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { inquiries } from '../../db/schema';
import { inquiryStatuses, statusLabels, type InquiryStatus } from '../../lib/dashboard';

type Inquiry = typeof inquiries.$inferSelect;
type BoardCard = { id: string; name: string; column: string; inquiry: Inquiry };
const columns = inquiryStatuses.map((id) => ({ id, name: statusLabels[id] }));
const received = (date: Date | string | number, withTime = false) =>
  new Date(date).toLocaleString('en-GB', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    ...(withTime ? { year: 'numeric', hour: '2-digit', minute: '2-digit' } : {}),
  });

function StatusPill({ status }: { status: InquiryStatus }) {
  return (
    <Pill variant="outline" className="px-2 py-0.5">
      <StatusDot status={status} />
      {statusLabels[status]}
    </Pill>
  );
}
function StatusDot({ status }: { status: string }) {
  return (
    <span
      className="size-2 shrink-0 rounded-full"
      style={{ background: `var(--status-${status})` }}
      aria-hidden="true"
    />
  );
}
/** Stops a press on a control inside a card from starting a drag. */
const noDrag = {
  onMouseDown: (event: { stopPropagation: () => void }) => event.stopPropagation(),
  onTouchStart: (event: { stopPropagation: () => void }) => event.stopPropagation(),
  onKeyDown: (event: { stopPropagation: () => void }) => event.stopPropagation(),
};

export default function Inquiries({ items }: { items: Inquiry[] }) {
  const [list, setList] = useState(items);
  const [cards, setCards] = useState<BoardCard[]>(() =>
    items.map((inquiry) => ({
      id: String(inquiry.id),
      name: inquiry.fullName,
      column: inquiry.status,
      inquiry,
    })),
  );
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [status, setStatus] = useState<InquiryStatus>('new');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const term = query.toLowerCase();
  const matches = (i: Inquiry) =>
    `${i.fullName} ${i.company} ${i.pickup} ${i.destination}`.toLowerCase().includes(term);
  const filtered = list.filter((i) => (filter === 'all' || i.status === filter) && matches(i));

  function open(inquiry: Inquiry) {
    setSelected(inquiry);
    setStatus(inquiry.status);
    setError('');
  }
  /** A card dropped in another column: save the new status, or put the card back. */
  async function moved(id: string) {
    const card = cards.find((entry) => entry.id === id);
    const before = list.find((entry) => String(entry.id) === id);
    if (!card || !before || card.column === before.status) return;
    const next = card.column as InquiryStatus;
    const result = await actions.inquiryStatus({ id: before.id, status: next });
    if (result.error) {
      toast.error(`${before.fullName} was not moved: ${result.error.message}`);
      setCards((current) =>
        current.map((entry) => (entry.id === id ? { ...entry, column: before.status } : entry)),
      );
      return;
    }
    setList((current) =>
      current.map((entry) => (entry.id === before.id ? { ...entry, status: next } : entry)),
    );
    toast.success(`${before.fullName} moved to ${statusLabels[next]}.`);
  }
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

  const search = (
    <Input
      aria-label="Search inquiries"
      placeholder="Search name, company or route…"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      className="bg-background sm:max-w-sm"
    />
  );
  const empty = (title: string, description: string): ReactNode => (
    <Empty className="border bg-card">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Inbox />
        </EmptyMedia>
        <EmptyTitle className="text-base">{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );

  return (
    <>
      <Tabs defaultValue="board" className="gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList aria-label="Inquiry view">
            <TabsTrigger value="board">Board</TabsTrigger>
            <TabsTrigger value="table">Table</TabsTrigger>
          </TabsList>
          {search}
        </div>
        <TabsContent value="board" className="flex flex-col gap-3">
          {list.length === 0 ? (
            empty('No inquiries yet', 'New quotation requests will appear here.')
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Drag a card to another column to change its status, or open it for the details.
              </p>
              {/* Four columns need room; on small screens the board scrolls sideways. */}
              <div className="overflow-x-auto pb-2">
                <KanbanProvider
                  columns={columns}
                  data={cards.filter((card) => matches(card.inquiry))}
                  onDataChange={(next) =>
                    // Cards hidden by the search keep their place.
                    setCards((current) => [
                      ...next,
                      ...current.filter((card) => !next.some((entry) => entry.id === card.id)),
                    ])
                  }
                  onDragEnd={(event) => void moved(String(event.active.id))}
                  className="min-w-[56rem]"
                >
                  {(column) => (
                    <KanbanBoard id={column.id} key={column.id} className="bg-background">
                      <KanbanHeader className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium">
                        <StatusDot status={column.id} />
                        <span>{column.name}</span>
                        <span className="ml-auto text-muted-foreground tabular-nums">
                          {cards.filter((card) => card.column === column.id).length}
                        </span>
                      </KanbanHeader>
                      <KanbanCards<BoardCard> id={column.id} className="min-h-24">
                        {(card) => (
                          <KanbanCard key={card.id} {...card} className="gap-2 text-sm">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate font-medium">{card.inquiry.fullName}</p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {card.inquiry.company}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`View inquiry from ${card.inquiry.fullName}`}
                                onClick={() => open(card.inquiry)}
                                {...noDrag}
                              >
                                <Eye />
                              </Button>
                            </div>
                            <p className="text-xs">
                              {card.inquiry.pickup} to {card.inquiry.destination}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                              {card.inquiry.containerType && (
                                <Pill variant="secondary" className="px-2 py-0.5 font-medium">
                                  {card.inquiry.containerType}
                                </Pill>
                              )}
                              <span className="truncate">{card.inquiry.serviceType}</span>
                              <span className="ml-auto shrink-0">
                                {received(card.inquiry.createdAt)}
                              </span>
                            </div>
                          </KanbanCard>
                        )}
                      </KanbanCards>
                    </KanbanBoard>
                  )}
                </KanbanProvider>
              </div>
            </>
          )}
        </TabsContent>
        <TabsContent value="table" className="flex flex-col gap-4">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger aria-label="Filter inquiry status" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectGroup>
                <SelectItem value="all">All statuses</SelectItem>
                {inquiryStatuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {statusLabels[s]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
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
                      <p className="min-w-32 font-medium">{item.fullName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.company}</p>
                    </TableCell>
                    <TableCell>
                      <p className="min-w-32">
                        {item.pickup} to {item.destination}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {[item.serviceType, item.containerType].filter(Boolean).join(', ')}
                      </p>
                    </TableCell>
                    <TableCell>
                      <StatusPill status={item.status} />
                    </TableCell>
                    <TableCell>
                      <span className="text-xs whitespace-nowrap">{received(item.createdAt)}</span>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => open(item)}>
                        View inquiry
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!filtered.length &&
              empty('No inquiries found', 'Try a different search or status filter.')}
          </Card>
          <p className="text-xs text-muted-foreground">
            {filtered.length} of {list.length} inquiries. Private to administrators.
          </p>
        </TabsContent>
      </Tabs>
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
                  ['Received', received(selected.createdAt, true)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="mt-1 text-sm font-medium break-words">{value}</dd>
                  </div>
                ))}
              </dl>
              <div>
                <h3 className="text-xs text-muted-foreground">Message</h3>
                <p className="mt-2 text-sm leading-relaxed break-words whitespace-pre-wrap">
                  {selected.message || 'No additional message.'}
                </p>
              </div>
              <Separator />
              <Field>
                <FieldLabel htmlFor="status">Inquiry status</FieldLabel>
                <Select value={status} onValueChange={(s) => setStatus(s as InquiryStatus)}>
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectGroup>
                      {inquiryStatuses.map((s) => (
                        <SelectItem key={s} value={s}>
                          {statusLabels[s]}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
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
