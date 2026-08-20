"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await api.login({ username, password });
      router.push(searchParams.get("next") ?? "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto px-6 py-24 w-full">
      <h1 className="text-2xl font-bold mb-8">Log in</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <div>
          <Label htmlFor="username">Username or email</Label>
          <Input
            id="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={pending} className="mt-2">
          {pending ? "Logging in..." : "Log in"}
        </Button>
      </form>
      <p className="text-sm text-muted mt-8">
        No account?{" "}
        <Link href="/register" className="text-foreground underline underline-offset-4">
          Register
        </Link>
      </p>
    </div>
  );
}
