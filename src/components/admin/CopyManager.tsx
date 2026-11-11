import { useEffect, useMemo, useState } from 'react';
import { actions } from 'astro:actions';
import { CircleAlert, CircleCheck, ExternalLink, Save, Search } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  copyKeys,
  copyPages,
  type CopyField,
  type CopyPage,
  type CopySection,
} from '../../lib/copy-fields';

const languages = [
  ['id', 'Indonesian'],
  ['en', 'English'],
] as const;
type Language = (typeof languages)[number][0];
type Text = Record<Language, string>;
type Texts = Record<string, Text>;

function FieldRow({
  field,
  value,
  edited,
  onChange,
  onReset,
}: {
  field: CopyField;
  value: Text;
  edited: boolean;
  onChange: (language: Language, text: string) => void;
  onReset: () => void;
}) {
  const Control = field.multiline ? Textarea : Input;
  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,13rem)_1fr_1fr] md:items-start">
      <div className="flex flex-col items-start gap-1.5 md:pt-2">
        <span className="text-sm font-medium">{field.label}</span>
        {field.hint && <span className="text-xs text-muted-foreground">{field.hint}</span>}
        {edited && (
          <div className="flex items-center gap-1">
            <Badge variant="secondary">Edited</Badge>
            <Button type="button" variant="link" size="xs" onClick={onReset}>
              Reset
            </Button>
          </div>
        )}
      </div>
      {languages.map(([language, name]) => (
        <div key={language} className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground md:hidden" aria-hidden="true">
            {name}
          </span>
          <Control
            id={`copy-${field.key}-${language}`}
            aria-label={`${field.label} (${name})`}
            lang={language}
            value={value[language]}
            maxLength={2000}
            onChange={(event) => onChange(language, event.target.value)}
          />
        </div>
      ))}
    </div>
  );
}

function SectionCard({
  title,
  section,
  fields,
  values,
  isEdited,
  onChange,
  onReset,
}: {
  title: string;
  section: CopySection;
  fields: CopyField[];
  values: Texts;
  isEdited: (key: string) => boolean;
  onChange: (key: string, language: Language, text: string) => void;
  onReset: (key: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {section.note && <CardDescription>{section.note}</CardDescription>}
        {section.link && (
          <CardAction>
            <Button asChild variant="outline" size="sm">
              <a href={section.link.href}>{section.link.label}</a>
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div
          className="hidden gap-3 text-xs font-medium text-muted-foreground md:grid md:grid-cols-[minmax(0,13rem)_1fr_1fr]"
          aria-hidden="true"
        >
          <span>Text</span>
          {languages.map(([language, name]) => (
            <span key={language}>{name}</span>
          ))}
        </div>
        {fields.map((field, index) => (
          <div key={field.key} className="flex flex-col gap-5">
            {index > 0 && <Separator />}
            <FieldRow
              field={field}
              value={values[field.key]}
              edited={isEdited(field.key)}
              onChange={(language, text) => onChange(field.key, language, text)}
              onReset={() => onReset(field.key)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/** Edits the wording of every public section, both languages side by side. */
export default function CopyManager({
  base,
  saved,
}: {
  /** Default wording per language, keyed by dictionary path. */
  base: Record<Language, Record<string, string>>;
  /** Wording changed earlier. */
  saved: Record<string, Text>;
}) {
  const withDefaults = (texts: Record<string, Partial<Text> | undefined>): Texts =>
    Object.fromEntries(
      [...copyKeys].map((key) => [
        key,
        {
          id: texts[key]?.id?.trim() || base.id[key],
          en: texts[key]?.en?.trim() || base.en[key],
        },
      ]),
    );
  const initial = useMemo(() => withDefaults(saved), []);
  const [stored, setStored] = useState<Texts>(initial);
  const [values, setValues] = useState<Texts>(initial);
  const [tab, setTab] = useState(copyPages[0].id);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const changed = [...copyKeys].filter(
    (key) => values[key].id !== stored[key].id || values[key].en !== stored[key].en,
  );
  const isEdited = (key: string) =>
    values[key].id !== base.id[key] || values[key].en !== base.en[key];
  const onChange = (key: string, language: Language, text: string) => {
    setSuccess(false);
    setValues((current) => ({ ...current, [key]: { ...current[key], [language]: text } }));
  };
  const onReset = (key: string) => {
    setSuccess(false);
    setValues((current) => ({ ...current, [key]: { id: base.id[key], en: base.en[key] } }));
  };

  // Warn before leaving with unsaved wording.
  useEffect(() => {
    if (!changed.length) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [changed.length]);

  async function save() {
    setBusy(true);
    setError('');
    setSuccess(false);
    const result = await actions.saveCopy({
      entries: changed.map((key) => ({ key, ...values[key] })),
    });
    setBusy(false);
    if (result.error) {
      const message = result.error.message.startsWith('Failed to validate')
        ? 'Some text is too long. Keep each field under 2,000 characters.'
        : result.error.message;
      setError(message);
      toast.error(message);
      return;
    }
    // A field left blank goes back to its default wording.
    const next = withDefaults(values);
    setStored(next);
    setValues(next);
    setSuccess(true);
    toast.success('Text saved.');
  }

  const term = query.trim().toLowerCase();
  const matches = (field: CopyField) =>
    [field.label, values[field.key].id, values[field.key].en].some((text) =>
      text.toLowerCase().includes(term),
    );
  const sectionCards = (page: CopyPage, searching: boolean) =>
    page.sections.flatMap((section) => {
      const fields = searching ? section.fields.filter(matches) : section.fields;
      return fields.length
        ? [
            <SectionCard
              key={`${page.id}-${section.title}`}
              title={searching ? `${page.title} / ${section.title}` : section.title}
              section={section}
              fields={fields}
              values={values}
              isEdited={isEdited}
              onChange={onChange}
              onReset={onReset}
            />,
          ]
        : [];
    });
  const results = term ? copyPages.flatMap((page) => sectionCards(page, true)) : [];
  const current = copyPages.find((page) => page.id === tab);

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <Toaster richColors />
      {error && (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert role="status">
          <CircleCheck />
          <AlertDescription>Text saved. The website now shows the new wording.</AlertDescription>
        </Alert>
      )}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
        <Input
          type="search"
          aria-label="Search text"
          placeholder="Search all pages…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="pl-9"
        />
      </div>
      {term ? (
        results.length ? (
          <div className="flex flex-col gap-6">{results}</div>
        ) : (
          <Empty className="border bg-card">
            <EmptyHeader>
              <EmptyTitle>No text found</EmptyTitle>
              <EmptyDescription>Try a word that appears on the website.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )
      ) : (
        <Tabs value={tab} onValueChange={setTab} className="gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* On small screens the page tabs scroll sideways instead of wrapping. */}
            <div className="max-w-full overflow-x-auto">
              <TabsList>
                {copyPages.map((page) => (
                  <TabsTrigger key={page.id} value={page.id}>
                    {page.title}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            {current?.href && (
              <Button asChild variant="outline" size="sm">
                <a href={current.href} target="_blank" rel="noopener noreferrer">
                  <ExternalLink data-icon="inline-start" />
                  View page
                </a>
              </Button>
            )}
          </div>
          {copyPages.map((page) => (
            <TabsContent key={page.id} value={page.id} className="flex flex-col gap-6">
              {sectionCards(page, false)}
            </TabsContent>
          ))}
        </Tabs>
      )}
      <div className="sticky bottom-4 z-10">
        <Card className="flex-row flex-wrap items-center justify-between gap-3 px-4 py-3 shadow-md">
          <span className="text-sm text-muted-foreground" aria-live="polite">
            {changed.length
              ? `${changed.length} unsaved ${changed.length === 1 ? 'change' : 'changes'}`
              : 'No unsaved changes'}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!changed.length || busy}
              onClick={() => setValues(stored)}
            >
              Discard
            </Button>
            <Button type="button" disabled={!changed.length || busy} onClick={() => void save()}>
              <Save data-icon="inline-start" />
              {busy ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
