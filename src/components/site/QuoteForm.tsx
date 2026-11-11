import { ArrowDown, ArrowRight } from 'lucide-react';
import {
  Choicebox,
  ChoiceboxIndicator,
  ChoiceboxItem,
  ChoiceboxItemDescription,
  ChoiceboxItemHeader,
  ChoiceboxItemTitle,
} from '@/components/kibo-ui/choicebox';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import FormSelect from './FormSelect';

export type QuoteFormLabels = {
  fullName: string;
  company: string;
  phoneField: string;
  emailField: string;
  serviceType: string;
  servicePlaceholder: string;
  pickup: string;
  destination: string;
  containerType: string;
  message: string;
  messagePlaceholder: string;
  privacy: string;
  submit: string;
  shipmentHeading: string;
  detailsHeading: string;
};

/**
 * The quotation form. It posts natively to the Astro action, so it works before React
 * loads; hydration is only needed for the container-type choice boxes.
 *
 * The shipment comes first (what, from where to where, which container), then who is asking:
 * a visitor arriving from the quick quote on Home finds the choices they made already filled in
 * at the top. Origin and destination read as a route, and the container sizes are drawn to scale.
 */
export default function QuoteForm({
  action,
  token,
  services,
  containers,
  selectedService,
  selectedContainer,
  values = {},
  labels,
}: {
  action: string;
  token: string;
  services: { slug: string; title: string }[];
  containers: { value: string; name: string; detail: string }[];
  selectedService: string;
  selectedContainer: string;
  /** What the visitor typed before the server refused the request; filled back in. */
  values?: Partial<Record<string, string>>;
  labels: QuoteFormLabels;
}) {
  const textFields = [
    ['fullName', labels.fullName, 'text', 'name'],
    ['company', labels.company, 'text', 'organization'],
    ['phone', labels.phoneField, 'tel', 'tel'],
    ['email', labels.emailField, 'email', 'email'],
  ] as const;
  return (
    <form method="POST" action={action}>
      <input type="hidden" name="token" value={token} />
      {/* Honeypot: hidden from people, tempting to bots. */}
      <div className="absolute -left-[10000px] size-px overflow-hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <FieldGroup>
        <FieldSet>
          <FieldLegend className="text-lg font-semibold">{labels.shipmentHeading}</FieldLegend>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="serviceType">{labels.serviceType} *</FieldLabel>
              <FormSelect
                id="serviceType"
                name="serviceType"
                required
                defaultValue={selectedService}
                placeholder={labels.servicePlaceholder}
                options={services.map(({ slug, title }) => ({ value: slug, label: title }))}
              />
            </Field>
            <div className="quote-route">
              {(
                [
                  ['pickup', labels.pickup],
                  ['destination', labels.destination],
                ] as const
              ).map(([name, label], i) => (
                <Field key={name} className={i === 0 ? 'quote-route-from' : 'quote-route-to'}>
                  <FieldLabel htmlFor={name}>{label} *</FieldLabel>
                  <Input
                    id={name}
                    name={name}
                    type="text"
                    required
                    minLength={2}
                    maxLength={250}
                    defaultValue={values[name]}
                  />
                </Field>
              ))}
              <span className="quote-route-arrow" aria-hidden="true">
                <ArrowRight className="max-sm:hidden" />
                <ArrowDown className="sm:hidden" />
              </span>
            </div>
            <FieldSet>
              <FieldLegend variant="label">{labels.containerType} *</FieldLegend>
              <Choicebox
                name="containerType"
                defaultValue={selectedContainer || undefined}
                required
                className="grid grid-cols-2"
              >
                {containers.map((container, i) => (
                  <ChoiceboxItem
                    key={container.value}
                    value={container.value}
                    id={`container-${container.value}`}
                    className="flex-wrap"
                  >
                    {/* Both boxes share one scale: a 20 ft container is half a 40 ft one. */}
                    <span className="quote-container" aria-hidden="true">
                      <span
                        className="container-bar quote-container-bar"
                        style={{ width: i === 0 ? '49.7%' : '100%' }}
                      />
                    </span>
                    <ChoiceboxItemHeader>
                      <ChoiceboxItemTitle id={`container-${container.value}-name`}>
                        {container.name}
                      </ChoiceboxItemTitle>
                      <ChoiceboxItemDescription id={`container-${container.value}-length`}>
                        {container.detail}
                      </ChoiceboxItemDescription>
                    </ChoiceboxItemHeader>
                    <ChoiceboxIndicator
                      id={`container-${container.value}`}
                      aria-labelledby={`container-${container.value}-name`}
                      aria-describedby={`container-${container.value}-length`}
                    />
                  </ChoiceboxItem>
                ))}
              </Choicebox>
            </FieldSet>
          </FieldGroup>
        </FieldSet>
        <FieldSeparator />
        <FieldSet>
          <FieldLegend className="text-lg font-semibold">{labels.detailsHeading}</FieldLegend>
          <div className="grid gap-5 sm:grid-cols-2">
            {textFields.map(([name, label, type, autoComplete]) => (
              <Field key={name}>
                <FieldLabel htmlFor={name}>{label} *</FieldLabel>
                <Input
                  id={name}
                  name={name}
                  type={type}
                  autoComplete={autoComplete}
                  required
                  minLength={name === 'phone' ? 8 : 2}
                  maxLength={name === 'phone' ? 30 : 250}
                  defaultValue={values[name]}
                />
              </Field>
            ))}
          </div>
        </FieldSet>
        <Field>
          <FieldLabel htmlFor="message">{labels.message}</FieldLabel>
          <Textarea
            id="message"
            name="message"
            maxLength={3000}
            placeholder={labels.messagePlaceholder}
            defaultValue={values.message}
          />
        </Field>
        <FieldDescription>{labels.privacy}</FieldDescription>
        <Button type="submit" size="lg">
          {labels.submit}
        </Button>
      </FieldGroup>
    </form>
  );
}
