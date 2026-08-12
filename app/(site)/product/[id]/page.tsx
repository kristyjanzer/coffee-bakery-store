import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/product/ProductDetail";
import { getProductById } from "@/lib/menu";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const product = getProductById(Number(id));

  if (!product) {
    notFound();
  }

  return (
    <main className="bg-warm-cream px-6 py-16">
      <div className="mx-auto max-w-[1200px]">
        <ProductDetail product={product} />
      </div>
    </main>
  );
}
