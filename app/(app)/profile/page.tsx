import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { fileUrl } from '@/lib/pocketbase';
import { ProfileForm } from './profile-form';

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const avatarUrl = user.avatar
    ? fileUrl('users', user.id, user.avatar, '400x400')
    : undefined;

  return (
    <div className="max-w-lg mx-auto">

      <div className="mb-8">
        <p className="eyebrow mb-2">Your profile</p>
        <h1 className="font-heading font-black text-4xl text-ink tracking-tight">
          {user.name || user.email}
        </h1>
        <p className="text-ink-soft mt-1">Update your name and photo.</p>
      </div>

      <ProfileForm name={user.name} email={user.email} avatarUrl={avatarUrl} />
    </div>
  );
}
