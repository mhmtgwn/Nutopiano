import { redirect } from 'next/navigation';

export default async function UrunRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/products/${id}`);
}
