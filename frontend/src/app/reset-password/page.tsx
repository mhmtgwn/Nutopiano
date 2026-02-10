import { Suspense } from 'react';

import ResetPasswordClient from './ResetPasswordClient';

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: { token?: string | string[] };
}) {
  const token = Array.isArray(searchParams?.token)
    ? searchParams?.token[0]
    : searchParams?.token;

  return (
    <Suspense>
      <ResetPasswordClient token={token ?? ''} />
    </Suspense>
  );
}
