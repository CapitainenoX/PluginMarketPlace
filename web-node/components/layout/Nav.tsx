import Link from "next/link";
import { currentUserOrNull } from "@/lib/api-client";
import { LogoutButton } from "./LogoutButton";

export async function Nav() {
  const user = await currentUserOrNull();

  return (
    <header className="border-b border-border">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-sm font-bold tracking-[0.2em] uppercase">
          MC Marketplace
        </Link>
        <nav className="flex items-center gap-8 text-sm">
          <Link href="/browse" className="hover:opacity-60 transition-opacity">
            Browse
          </Link>
          <Link href="/install" className="hover:opacity-60 transition-opacity">
            Get the plugin
          </Link>
          <Link href="/docs" className="hover:opacity-60 transition-opacity">
            Docs
          </Link>
          {user ? (
            <>
              <Link href="/dashboard" className="hover:opacity-60 transition-opacity">
                Dashboard
              </Link>
              {user.role === "admin" && (
                <Link href="/admin" className="hover:opacity-60 transition-opacity">
                  Admin
                </Link>
              )}
              <span className="text-muted hidden sm:inline">{user.username}</span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="hover:opacity-60 transition-opacity">
                Log in
              </Link>
              <Link
                href="/register"
                className="border border-foreground px-4 py-1.5 uppercase text-xs tracking-wide hover:bg-foreground hover:text-background transition-colors"
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
