"use client";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import {
  type ComponentProps,
  createContext,
  type HTMLAttributes,
  useContext,
} from "react";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";

export type ChoiceboxProps = ComponentProps<typeof RadioGroup>;

const ARROW_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

/**
 * Local change: selection always follows arrow-key focus. Radix moves focus to the next radio
 * in a timeout after keydown, but only checks it if the arrow key is still held at that
 * moment; a keydown and keyup sent together (automation, some assistive tools) moved focus
 * without choosing anything. This runs after Radix's timeout and clicks the newly focused
 * radio if it is not checked yet, so a held key (already checked by Radix) is left alone.
 */
export const Choicebox = ({ className, onKeyDown, ...props }: ChoiceboxProps) => (
  <RadioGroup
    className={cn("w-full", className)}
    onKeyDown={(event) => {
      onKeyDown?.(event);
      if (!ARROW_KEYS.includes(event.key)) return;
      const group = event.currentTarget;
      setTimeout(() => {
        const focused = document.activeElement;
        if (
          focused instanceof HTMLElement &&
          group.contains(focused) &&
          focused.getAttribute("role") === "radio" &&
          focused.getAttribute("aria-checked") !== "true"
        )
          focused.click();
      });
    }}
    {...props}
  />
);

type ChoiceboxItemContextValue = {
  value: ChoiceboxItemProps["value"];
  id?: ChoiceboxItemProps["id"];
};

const ChoiceboxItemContext = createContext<ChoiceboxItemContextValue | null>(
  null
);

const useChoiceboxItemContext = () => {
  const context = useContext(ChoiceboxItemContext);

  if (!context) {
    throw new Error(
      "useChoiceboxItemContext must be used within a ChoiceboxItem"
    );
  }

  return context;
};

export type ChoiceboxItemProps = ComponentProps<typeof RadioGroupItem>;

export const ChoiceboxItem = ({
  className,
  children,
  value,
  id,
}: ChoiceboxItemProps) => (
  <ChoiceboxItemContext.Provider value={{ value, id }}>
    <FieldLabel htmlFor={id}>
      <Field className={className} orientation="horizontal">
        {children}
      </Field>
    </FieldLabel>
  </ChoiceboxItemContext.Provider>
);

export type ChoiceboxItemHeaderProps = ComponentProps<typeof FieldContent>;

export const ChoiceboxItemHeader = ({
  className,
  ...props
}: ChoiceboxItemHeaderProps) => (
  <FieldContent className={className} {...props} />
);

export type ChoiceboxItemTitleProps = ComponentProps<typeof FieldTitle>;

export const ChoiceboxItemTitle = ({
  className,
  ...props
}: ChoiceboxItemTitleProps) => <FieldTitle className={className} {...props} />;

export type ChoiceboxItemSubtitleProps = HTMLAttributes<HTMLSpanElement>;

export const ChoiceboxItemSubtitle = ({
  className,
  ...props
}: ChoiceboxItemSubtitleProps) => (
  <span
    className={cn("font-normal text-muted-foreground text-xs", className)}
    {...props}
  />
);

export type ChoiceboxItemDescriptionProps = ComponentProps<
  typeof FieldDescription
>;

export const ChoiceboxItemDescription = ({
  className,
  ...props
}: ChoiceboxItemDescriptionProps) => (
  <FieldDescription className={className} {...props} />
);

export type ChoiceboxIndicatorProps = Partial<
  ComponentProps<typeof RadioGroupItem>
>;

export const ChoiceboxIndicator = (props: ChoiceboxIndicatorProps) => {
  const context = useChoiceboxItemContext();

  return <RadioGroupItem {...props} value={context.value} />;
};
