import { useEffect, useRef, type ComponentPropsWithoutRef } from "react"
import { useInView, useMotionValue, useReducedMotion, useSpring } from "motion/react"

import { cn } from "@/lib/utils"

interface NumberTickerProps extends ComponentPropsWithoutRef<"span"> {
  value: number
  startValue?: number
  direction?: "up" | "down"
  delay?: number
  decimalPlaces?: number
  /** BCP 47 locale for the digit grouping, e.g. "id-ID" prints 25.000. */
  locale?: string
}

/**
 * Magic UI number ticker. Adapted for this project: the server renders the final value (so the
 * number is right without JavaScript and for reduced motion), the count runs once the number
 * scrolls into view, and the digits follow the visitor's locale.
 */
export function NumberTicker({
  value,
  startValue = 0,
  direction = "up",
  delay = 0,
  className,
  decimalPlaces = 0,
  locale = "en-US",
  ...props
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const reduced = useReducedMotion()
  const from = direction === "down" ? value : startValue
  const to = direction === "down" ? startValue : value
  const motionValue = useMotionValue(from)
  const springValue = useSpring(motionValue, {
    damping: 60,
    stiffness: 100,
  })
  const isInView = useInView(ref, { once: true, margin: "0px" })
  const format = (n: number) =>
    Intl.NumberFormat(locale, {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(Number(n.toFixed(decimalPlaces)))

  // Rewind to the start value after hydration, unless the visitor asked for less motion.
  useEffect(() => {
    if (!reduced && !isInView && ref.current) ref.current.textContent = format(from)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced])

  useEffect(() => {
    if (reduced || !isInView) return
    const timer = setTimeout(() => motionValue.set(to), delay * 1000)
    return () => clearTimeout(timer)
  }, [motionValue, isInView, delay, to, reduced])

  useEffect(
    () =>
      springValue.on("change", (latest) => {
        if (ref.current) ref.current.textContent = format(latest)
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [springValue, decimalPlaces, locale]
  )

  return (
    <span ref={ref} className={cn("inline-block tabular-nums", className)} {...props}>
      {format(to)}
    </span>
  )
}
