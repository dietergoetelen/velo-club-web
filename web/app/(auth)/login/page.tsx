import { LoginForm } from './login-form';

// `next` lets invite links route an existing user back to /join/<token> after
// they sign in. Read here (server) and handed to the client form as a prop, so
// the form needn't reach for useSearchParams.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  return <LoginForm next={typeof next === 'string' ? next : ''} />;
}
