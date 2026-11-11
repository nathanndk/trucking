import { useEffect, useRef, useState } from 'react';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Option = { value: string; label: string };

/**
 * A form dropdown that opens the site's own list (shadcn Select) instead of the operating
 * system's. Until React has loaded, and without JavaScript, it is the native select, so the form
 * keeps working. Once loaded the visible part is the Select, while a hidden native select with the
 * same name, value and required check is what the form submits and validates, so the server sees
 * exactly what it did before.
 */
export default function FormSelect({
  id,
  name,
  options,
  placeholder,
  defaultValue = '',
  required = false,
}: {
  /** Goes on the visible control, so a FieldLabel with htmlFor={id} names it. */
  id: string;
  name: string;
  options: Option[];
  placeholder: string;
  defaultValue?: string;
  required?: boolean;
}) {
  const known = options.some((option) => option.value === defaultValue);
  const [value, setValue] = useState(known ? defaultValue : '');
  const [enhanced, setEnhanced] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const native = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    // Keep a choice made in the native select while the page was still loading.
    if (native.current?.value) setValue(native.current.value);
    setEnhanced(true);
  }, []);

  if (!enhanced)
    return (
      <NativeSelect
        ref={native}
        id={id}
        name={name}
        required={required}
        defaultValue={value}
        className="w-full"
      >
        <NativeSelectOption value="">{placeholder}</NativeSelectOption>
        {options.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    );

  return (
    <div className="relative w-full">
      <Select
        value={value || undefined}
        onValueChange={(next) => {
          setValue(next);
          setInvalid(false);
        }}
      >
        <SelectTrigger id={id} className="w-full" aria-invalid={invalid || undefined}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {/* What the form submits. It sits under the trigger's left edge so the browser's
          "please choose" bubble points at the dropdown when nothing is chosen. */}
      <select
        name={name}
        required={required}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onInvalid={() => setInvalid(true)}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only bottom-0 left-3"
      >
        <option value="" />
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
