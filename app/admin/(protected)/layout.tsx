import type { Metadata } from 'next';
import { redirect } from 'nextnavigation';
import { createClient } from '@libsupabaseserver';
import AdminNav from '@componentsadminAdminNav';

export const dynamic = 'force-dynamic';

export const metadata Metadata = {
  title 'Админка',
  robots { index false, follow false },
};

export default async function ProtectedAdminLayout({ children } { children React.ReactNode }) {
  const supabase = createClient();
  const {
    data { user },
  } = await supabase.auth.getUser();

  if (!user  user.app_metadata.role !== 'admin') {
    redirect('adminlogin');
  }

  return (
    div className=min-h-screen
      AdminNav email={user.email  ''} 
      main className=container-x py-8{children}main
    div
  );
}