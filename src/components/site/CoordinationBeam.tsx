import { useRef, type RefObject } from 'react';
import { Factory, FileCheck2, Ship, Truck, type LucideIcon } from 'lucide-react';
import { AnimatedBeam } from '@/components/ui/animated-beam';
import { cn } from '@/lib/utils';

/** One icon per shipping stop, in route order: site, truck, customs, port. */
const icons: LucideIcon[] = [Factory, Truck, FileCheck2, Ship];

function Node({
  nodeRef,
  label,
  Icon,
  className,
}: {
  nodeRef: RefObject<HTMLDivElement | null>;
  label: string;
  Icon: LucideIcon;
  className?: string;
}) {
  return (
    <div className={cn('flex w-20 flex-col items-center gap-1.5 text-center', className)}>
      <div
        ref={nodeRef}
        className="relative z-10 flex size-11 items-center justify-center rounded-full border bg-card text-primary shadow-sm"
      >
        <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
      </div>
      {/* Two lines tall either way, so the circles on both sides stay level. */}
      <span className="min-h-[2lh] text-xs leading-tight font-medium text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

/**
 * "One point of coordination": the four shipping stops on the outside, all wired to Genesis in
 * the middle. The beams are the one moving element of the strengths grid.
 */
export default function CoordinationBeam({
  stops,
  mark,
  name,
}: {
  /** Names of the four shipping stops, in route order. */
  stops: string[];
  /** Square company mark shown in the middle. */
  mark: string;
  /** Company name, the mark's alternative text. */
  name: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const hub = useRef<HTMLDivElement>(null);
  const refs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ];
  const nodes = stops.slice(0, 4).map((label, i) => ({ label, Icon: icons[i], ref: refs[i] }));
  const left = nodes.slice(0, 2);
  const right = nodes.slice(2);
  return (
    <div
      ref={container}
      className="relative flex h-full min-h-44 w-full items-center justify-between gap-4"
    >
      <div className="flex flex-col gap-6">
        {left.map((node) => (
          <Node key={node.label} nodeRef={node.ref} label={node.label} Icon={node.Icon} />
        ))}
      </div>
      <div
        ref={hub}
        className="relative z-10 flex size-16 items-center justify-center rounded-full border bg-card p-2.5 shadow-md"
      >
        <img src={mark} alt={name} width="44" height="44" className="size-full object-contain" />
      </div>
      <div className="flex flex-col gap-6">
        {right.map((node) => (
          <Node key={node.label} nodeRef={node.ref} label={node.label} Icon={node.Icon} />
        ))}
      </div>
      {nodes.map((node, i) => (
        <AnimatedBeam
          key={node.label}
          containerRef={container}
          fromRef={node.ref}
          toRef={hub}
          // Side stops on the right flow back into the hub, so every beam travels inwards.
          reverse={i >= 2}
          curvature={i % 2 === 0 ? 24 : -24}
          endYOffset={i % 2 === 0 ? -6 : 6}
          duration={4}
          delay={i * 0.6}
          pathColor="var(--foreground)"
          pathOpacity={0.14}
          gradientStartColor="var(--primary)"
          gradientStopColor="var(--mint)"
        />
      ))}
    </div>
  );
}
