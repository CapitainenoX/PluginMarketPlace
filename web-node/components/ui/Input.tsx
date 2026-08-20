import { InputHTMLAttributes, LabelHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Label(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      {...props}
      className={`block text-xs font-medium uppercase tracking-wide text-muted mb-1.5 ${props.className ?? ""}`}
    />
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full border border-border px-3.5 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:border-foreground transition-colors ${props.className ?? ""}`}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full border border-border px-3.5 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:border-foreground transition-colors ${props.className ?? ""}`}
    />
  );
}
