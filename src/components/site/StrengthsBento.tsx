import type { ReactNode } from 'react';
import { FileCheck2, ShieldCheck, Waypoints, type LucideIcon } from 'lucide-react';
import { BentoGrid } from '@/components/ui/bento-grid';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GridPattern } from '@/components/ui/grid-pattern';
import { cn } from '@/lib/utils';

/** A grid texture that fades out towards the text, with a few cells filled in. */
function Texture({ squares }: { squares: [number, number][] }) {
  return (
    <GridPattern
      width={28}
      height={28}
      squares={squares}
      className="fill-primary/15 stroke-foreground/15 [mask-image:linear-gradient(to_bottom_left,white,transparent_75%)]"
    />
  );
}
const icons: { Icon: LucideIcon; squares: [number, number][] }[] = [
  {
    Icon: FileCheck2,
    squares: [
      [5, 0],
      [7, 1],
      [9, 0],
    ],
  },
  {
    Icon: Waypoints,
    squares: [
      [6, 1],
      [8, 0],
      [10, 2],
    ],
  },
  {
    Icon: ShieldCheck,
    squares: [
      [4, 0],
      [7, 2],
      [9, 1],
    ],
  },
];

/**
 * The five strengths as a bento on the home page. The first two cards carry a small drawing
 * of what they say (both container sizes to scale, and the route to the port); the other
 * three sit on a static grid texture.
 */
export default function StrengthsBento({
  items,
  sizes,
  route,
}: {
  items: { title: string; text: string }[];
  /** Names of the two container sizes, shortest first. */
  sizes: string[];
  /** Names of the stops on the shipping route. */
  route: string[];
}) {
  const figures: ReactNode[] = [
    <div className="grid w-full gap-2.5" key="sizes">
      {sizes.map((name, i) => (
        <div className="flex items-center gap-3" key={name}>
          <span className={cn('container-bar block h-8', i === 0 ? 'w-[38%]' : 'w-[76%]')} />
          <span className="text-sm font-semibold tabular-nums">{name}</span>
        </div>
      ))}
    </div>,
    <div className="grid w-full gap-2" key="route">
      <div className="relative flex items-center justify-between">
        <span className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-foreground/25" />
        {route.map((stop, i) => (
          <span
            key={stop}
            className={cn(
              'relative size-3.5 rounded-full border-2 border-foreground bg-background',
              i === route.length - 1 && 'border-primary bg-primary',
            )}
          />
        ))}
      </div>
      <div className="flex justify-between gap-4 text-sm font-semibold">
        <span>{route[0]}</span>
        <span className="text-right">{route[route.length - 1]}</span>
      </div>
    </div>,
  ];
  return (
    <BentoGrid className="strengths-bento auto-rows-auto gap-5" data-motion="group">
      {items.map((item, i) => {
        const drawn = figures[i];
        const plain = icons[(i - figures.length) % icons.length];
        return (
          <Card
            key={item.title}
            data-motion-item
            className={cn(
              'col-span-3 gap-0 overflow-hidden py-0',
              i === 0 ? 'md:col-span-2' : 'md:col-span-1',
            )}
          >
            <div
              aria-hidden="true"
              className="relative flex h-24 items-center overflow-hidden border-b bg-muted px-6 md:h-32"
            >
              {drawn ?? (
                <>
                  <Texture squares={plain.squares} />
                  <plain.Icon className="relative size-9 text-primary" strokeWidth={1.5} />
                </>
              )}
            </div>
            <CardHeader className="gap-2 py-5">
              <CardTitle>
                <h3>{item.title}</h3>
              </CardTitle>
              <CardDescription className="text-[15px]">{item.text}</CardDescription>
            </CardHeader>
          </Card>
        );
      })}
    </BentoGrid>
  );
}
