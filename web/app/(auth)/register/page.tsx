import { RegisterForm } from './register-form';

// See login/page.tsx — `next` carries an invite link's destination through
// sign-up so a brand-new user lands straight in the club they were invited to.
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  return <RegisterForm next={typeof next === 'string' ? next : ''} />;
}
