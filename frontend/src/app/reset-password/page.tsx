import { Suspense } from 'react';

import ResetPasswordClient from './ResetPasswordClient';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string | string[] }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const token = Array.isArray(resolvedSearchParams?.token)
    ? resolvedSearchParams.token[0]
    : resolvedSearchParams?.token;

  return (
    <Suspense>
      <ResetPasswordClient token={token ?? ''} />
    </Suspense>
  );
}
