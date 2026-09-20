import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
export function Table({ className, ...props }: ComponentProps<'table'>) {
  return (
    <div className="relative w-full overflow-auto">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  );
}
export function TableHeader(props: ComponentProps<'thead'>) {
  return <thead className="border-b bg-muted/50" {...props} />;
}
export function TableBody(props: ComponentProps<'tbody'>) {
  return <tbody className="[&_tr:last-child]:border-0" {...props} />;
}
export function TableRow(props: ComponentProps<'tr'>) {
  return <tr className="border-b transition-colors hover:bg-muted/50" {...props} />;
}
export function TableHead(props: ComponentProps<'th'>) {
  return (
    <th className="h-12 px-4 text-left text-xs font-medium text-muted-foreground" {...props} />
  );
}
export function TableCell(props: ComponentProps<'td'>) {
  return <td className="p-4 align-middle" {...props} />;
}
