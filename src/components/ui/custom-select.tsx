"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { clsx } from "clsx";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export function CustomSelect({
  value,
  defaultValue,
  onValueChange,
  options,
  placeholder = "Select an option",
  disabled,
  invalid,
  name,
  id,
  ariaLabel,
  className,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  name?: string;
  id?: string;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <SelectPrimitive.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      disabled={disabled}
      name={name}
    >
      <SelectPrimitive.Trigger
        id={id}
        className={clsx("tn-select-trigger", className)}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
      >
        <SelectPrimitive.Value placeholder={placeholder} />

        <SelectPrimitive.Icon className="tn-select-chevron">
          <ChevronDown size={16} aria-hidden="true" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="tn-select-content"
          position="popper"
          sideOffset={6}
        >
          <SelectPrimitive.ScrollUpButton className="tn-select-scroll">
            <ChevronUp size={15} aria-hidden="true" />
          </SelectPrimitive.ScrollUpButton>

          <SelectPrimitive.Viewport className="tn-select-viewport">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="tn-select-item"
              >
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>

                <SelectPrimitive.ItemIndicator className="tn-select-check">
                  <Check size={15} aria-hidden="true" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>

          <SelectPrimitive.ScrollDownButton className="tn-select-scroll">
            <ChevronDown size={15} aria-hidden="true" />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
