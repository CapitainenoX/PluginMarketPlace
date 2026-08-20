import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUserOrNull } from "@/lib/api-client";

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/uploads", label: "My Plugins" },
  { href: "/dashboard/upload", label: "Upload" },
  { href: "/dashboard/api-keys", label: "API Keys" },
];

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const user = await currentUserOrNull();
  if (!user) redirect("/login?next=/dashboard");

  return (
    <div className="max-w-6xl mx-auto px-6 py-16 w-full flex flex-col sm:flex-row gap-12">
      <aside className="sm:w-48 shrink-0">
        <nav className="flex sm:flex-col gap-1 flex-wrap">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm px-3 py-2 hover:bg-neutral-100 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
