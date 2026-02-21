import Spinner from '@/components/common/Spinner';

export default function Loading() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-6xl flex-col px-4 py-10 md:px-6">
      <Spinner fullscreen label="Yükleniyor..." />
    </main>
  );
}
