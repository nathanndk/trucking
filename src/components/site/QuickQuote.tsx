import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';

/**
 * The first two answers of the quote form, asked in the hero. It is a plain GET form: the
 * contact page reads both choices from the address, so this needs no JavaScript.
 */
export default function QuickQuote({
  action,
  services,
  containers,
  more,
  labels,
}: {
  action: string;
  services: { slug: string; title: string }[];
  containers: { value: string; name: string }[];
  /** Secondary link beside the submit button. */
  more: { href: string; label: string };
  labels: {
    heading: string;
    service: string;
    servicePlaceholder: string;
    container: string;
    containerPlaceholder: string;
    submit: string;
  };
}) {
  return (
    <form method="get" action={action} className="quick-quote" aria-labelledby="quick-quote-title">
      <Card className="gap-4 py-5">
        <CardHeader className="px-5">
          <CardTitle>
            <h2 id="quick-quote-title" className="text-lg">
              {labels.heading}
            </h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 px-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="quick-service">{labels.service}</FieldLabel>
            <NativeSelect id="quick-service" name="service" defaultValue="" className="w-full">
              <NativeSelectOption value="">{labels.servicePlaceholder}</NativeSelectOption>
              {services.map((service) => (
                <NativeSelectOption key={service.slug} value={service.slug}>
                  {service.title}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="quick-container">{labels.container}</FieldLabel>
            <NativeSelect id="quick-container" name="container" defaultValue="" className="w-full">
              <NativeSelectOption value="">{labels.containerPlaceholder}</NativeSelectOption>
              {containers.map((container) => (
                <NativeSelectOption key={container.value} value={container.value}>
                  {container.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </CardContent>
        <CardFooter className="hero-actions px-5">
          <Button type="submit" size="lg">
            {labels.submit}
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href={more.href}>{more.label}</a>
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
