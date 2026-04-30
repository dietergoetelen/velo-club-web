import PocketBase from 'pocketbase';
import { ensureField } from '../migrate';

export async function up(pb: PocketBase) {
  await ensureField(pb, 'clubs', {
    name:      'avatar',
    type:      'file',
    required:  false,
    maxSelect: 1,
    maxSize:   5_242_880, // 5 MB
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    thumbs:    ['100x100', '400x400'],
  });
}
