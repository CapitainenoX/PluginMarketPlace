import { api } from "@/lib/api-client";
import { UploadWizard } from "./UploadWizard";
import { Reveal } from "@/components/motion/Reveal";

export default async function UploadPage() {
  const { categories } = await api.categories().catch(() => ({ categories: [] }));

  return (
    <div>
      <Reveal delay={0}>
        <h1 className="text-2xl font-bold mb-8">Publish a plugin</h1>
        <UploadWizard categories={categories} />
      </Reveal>
    </div>
  );
}
