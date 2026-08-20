import { HTMLAttributes } from "react";

export function Card(props: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={`border border-border p-6 ${props.className ?? ""}`}
    />
  );
}
