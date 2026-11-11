import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

/** Common questions. The first answer is open, so there is something to read before React loads. */
export default function Faq({ items }: { items: { question: string; answer: string }[] }) {
  return (
    <Accordion type="single" collapsible defaultValue="faq-0" className="faq">
      {items.map((item, i) => (
        <AccordionItem key={item.question} value={`faq-${i}`}>
          <AccordionTrigger className="text-[17px] font-semibold">{item.question}</AccordionTrigger>
          <AccordionContent className="max-w-[65ch] text-[15px] text-muted-foreground">
            {item.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
