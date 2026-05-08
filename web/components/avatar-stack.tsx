import { fileUrl } from '@/lib/pocketbase';

const COLORS = ['#FBBF24', '#F472B6', '#34D399', '#8B5CF6'] as const;

function getInitials(nameOrEmail: string): string {
  return (nameOrEmail || '?')
    .split(/[\s@.]+/)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase() ?? '')
    .join('');
}

export interface StackedUser {
  id:     string;
  name:   string;   // pre-resolved display name (name || username || email)
  avatar: string;   // file name; '' when no avatar
}

interface AvatarStackProps {
  users:   StackedUser[];
  /** Max avatars rendered before collapsing into a "+N" pill. */
  visible?: number;
  /** Avatar diameter in px. Default 32 (compact card). */
  size?:    number;
}

export function AvatarStack({ users, visible = 3, size = 32 }: AvatarStackProps) {
  if (users.length === 0) return null;

  const shown   = users.slice(0, visible);
  const hidden  = users.length - shown.length;
  // Negative margin = overlap. Each subsequent avatar slides ~35% under the previous one.
  const overlap = Math.round(size * 0.35);
  const fontPx  = Math.max(10, Math.round(size * 0.36));

  const baseStyle: React.CSSProperties = {
    width:        size,
    height:       size,
    border:       '2px solid var(--ink)',
    boxShadow:    '2px 2px 0px rgba(0,0,0,0.18)',
    fontSize:     fontPx,
  };

  return (
    <div className="flex items-center" aria-label={`${users.length} attending`}>
      {shown.map((u, i) => (
        <div
          key={u.id}
          className="rounded-full flex items-center justify-center overflow-hidden font-black text-ink shrink-0 bg-white"
          style={{
            ...baseStyle,
            backgroundColor: u.avatar ? '#fff' : COLORS[i % COLORS.length],
            marginLeft:       i === 0 ? 0 : -overlap,
            zIndex:           shown.length - i,
          }}
          title={u.name}
        >
          {u.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fileUrl('users', u.id, u.avatar, '100x100')}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            getInitials(u.name)
          )}
        </div>
      ))}
      {hidden > 0 && (
        <div
          className="rounded-full flex items-center justify-center font-black shrink-0"
          style={{
            ...baseStyle,
            backgroundColor: 'var(--muted)',
            color:           'var(--ink-soft)',
            marginLeft:      -overlap,
            zIndex:          0,
          }}
          title={`${hidden} more`}
        >
          +{hidden}
        </div>
      )}
    </div>
  );
}
