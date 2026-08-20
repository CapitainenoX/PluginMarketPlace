import { api } from "@/lib/api-client";
import { UploadWizard } from "./UploadWizard";

export default async function UploadPage() {
  const { categories } = await api.categories().catch(() => ({ categories: [] }));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Publish a plugin</h1>
      <UploadWizard categories={categories} />
    </div>
  );
}
