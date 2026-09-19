"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as MenuPrimitive from "@radix-ui/react-dropdown-menu";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import { X } from "lucide-react";
export function Dialog({
  trigger,
  title,
  description,
  icon,
  children,
  open,
  onOpenChange,
  className,
}: {
  trigger?: ReactNode;
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger && (
        <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      )}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog-backdrop" />
        <DialogPrimitive.Content
          className={`dialog${className ? ` ${className}` : ""}`}
          aria-describedby={description ? undefined : undefined}
        >
          {icon}
          <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
          {description && (
            <DialogPrimitive.Description className="muted">
              {description}
            </DialogPrimitive.Description>
          )}
          <DialogPrimitive.Close
            className="quiet dialog-close"
            aria-label="Close dialog"
          >
            <X size={20} aria-hidden />
          </DialogPrimitive.Close>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
export function Menu({
  trigger,
  items,
}: {
  trigger: ReactNode;
  items: Array<{
    label: string;
    href?: string;
    onSelect?: () => void | Promise<void>;
    separator?: boolean;
    tone?: "default" | "danger" | "primary";
  }>;
}) {
  return (
    <MenuPrimitive.Root modal={false}>
      <MenuPrimitive.Trigger asChild>{trigger}</MenuPrimitive.Trigger>
      <MenuPrimitive.Portal>
        <MenuPrimitive.Content className="popover" sideOffset={8} align="end">
          {items.map((item, index) => (
            <Fragment key={`${item.label}-${index}`}>
              {item.separator && (
                <MenuPrimitive.Separator className="menu-separator" />
              )}
              <MenuPrimitive.Item
                className={`menu-item${item.tone ? ` ${item.tone}` : ""}`}
                onSelect={item.onSelect}
                asChild={!!item.href}
              >
                {item.href ? (
                  <Link href={item.href}>{item.label}</Link>
                ) : (
                  item.label
                )}
              </MenuPrimitive.Item>
            </Fragment>
          ))}
        </MenuPrimitive.Content>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  );
}
export function Popover({
  trigger,
  children,
  open,
  onOpenChange,
  align = "center",
}: {
  trigger: ReactNode;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: "start" | "center" | "end";
}) {
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className="popover stack"
          sideOffset={8}
          align={align}
        >
          {children}
          <PopoverPrimitive.Close className="quiet">
            Close
          </PopoverPrimitive.Close>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
