"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/kit";

export function SubmitButton({
  children,
  pendingText = "Processing…",
  variant = "primary",
  size = "md",
  className,
  confirm,
}: {
  children: React.ReactNode;
  pendingText?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  className?: string;
  confirm?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      className={className}
      disabled={pending}
      onClick={
        confirm
          ? (event) => {
              if (!window.confirm(confirm)) event.preventDefault();
            }
          : undefined
      }
    >
      {pending ? pendingText : children}
    </Button>
  );
}
