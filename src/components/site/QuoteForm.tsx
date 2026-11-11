import { Button } from '@/components/ui/button';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';

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
};

/**
 * The quotation form. It posts natively to the Astro action, so it works before React
 * loads; hydration is only needed for the container-type radio group.
 */
export default function QuoteForm({
  action,
  token,
  services,
  containers,
  selectedService,
  selectedContainer,
  labels,
}: {
  action: string;
  token: string;
  services: { slug: string; title: string }[];
  containers: { value: string; name: string; detail: string }[];
  selectedService: string;
  selectedContainer: string;
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
              />
            </Field>
          ))}
        </div>
        <Field>
          <FieldLabel htmlFor="serviceType">{labels.serviceType} *</FieldLabel>
          <NativeSelect
            id="serviceType"
            name="serviceType"
            required
            defaultValue={selectedService}
            className="w-full"
          >
            <NativeSelectOption value="">{labels.servicePlaceholder}</NativeSelectOption>
            {services.map((service) => (
              <NativeSelectOption key={service.slug} value={service.slug}>
                {service.title}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          {(
            [
              ['pickup', labels.pickup],
              ['destination', labels.destination],
            ] as const
          ).map(([name, label]) => (
            <Field key={name}>
              <FieldLabel htmlFor={name}>{label} *</FieldLabel>
              <Input id={name} name={name} type="text" required minLength={2} maxLength={250} />
            </Field>
          ))}
        </div>
        <FieldSet>
          <FieldLegend variant="label">{labels.containerType} *</FieldLegend>
          <RadioGroup
            name="containerType"
            defaultValue={selectedContainer || undefined}
            required
            className="grid grid-cols-2"
          >
            {containers.map((container) => (
              <FieldLabel key={container.value} htmlFor={`container-${container.value}`}>
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldTitle>{container.name}</FieldTitle>
                    <FieldDescription>{container.detail}</FieldDescription>
                  </FieldContent>
                  <RadioGroupItem value={container.value} id={`container-${container.value}`} />
                </Field>
              </FieldLabel>
            ))}
          </RadioGroup>
        </FieldSet>
        <Field>
          <FieldLabel htmlFor="message">{labels.message}</FieldLabel>
          <Textarea
            id="message"
            name="message"
            maxLength={3000}
            placeholder={labels.messagePlaceholder}
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
