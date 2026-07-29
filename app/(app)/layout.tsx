import { redirect } from 'next/navigation';
import { getSession } from '../../src/services/auth';
import type { ReactNode } from 'react';
import Header from '../../src/ui/Header';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getSession();
  if (!user) redirect('/signin');
  return (
    <>
      <Header title="Sitzplan" />
      <main>{children}</main>
    </>
  );
}
