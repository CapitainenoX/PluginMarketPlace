"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { api } from "@/lib/api-client";

export function LogoutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await api.logout();
          router.push("/");
          router.refresh();
        })
      }
      className="uppercase text-xs tracking-wide hover:opacity-60 transition-opacity disabled:opacity-40 cursor-pointer"
    >
      Log out
    </button>
  );
}
