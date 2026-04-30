import PocketBase from 'pocketbase';
import { createCollectionIfMissing } from '../migrate';

export async function up(pb: PocketBase) {
  await createCollectionIfMissing(pb, 'clubs', {
    type: 'base',
    fields: [
      { name: 'name',        type: 'text',   required: true },
      { name: 'description', type: 'text',   required: false },
      { name: 'slug',        type: 'text',   required: true },
    ],
    listRule:   "@request.auth.id != ''",
    viewRule:   "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: '',
  });

  await createCollectionIfMissing(pb, 'club_members', {
    type: 'base',
    fields: [
      { name: 'club',   type: 'text', required: true },
      { name: 'user',   type: 'text', required: true },
      {
        name: 'role', type: 'select', required: true,
        values: ['captain', 'member'], maxSelect: 1,
      },
      { name: 'points', type: 'number', required: false },
    ],
    listRule:   "@request.auth.id != ''",
    viewRule:   "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
  });

  await createCollectionIfMissing(pb, 'routes', {
    type: 'base',
    fields: [
      { name: 'club',        type: 'text',   required: true },
      { name: 'created_by',  type: 'text',   required: true },
      { name: 'name',        type: 'text',   required: true },
      { name: 'date',        type: 'date',   required: true },
      { name: 'distance_km', type: 'number', required: true },
      { name: 'elevation_m', type: 'number', required: false },
      {
        name: 'surface', type: 'select', required: true,
        values: ['all', 'road', 'gravel'], maxSelect: 1,
      },
      { name: 'coordinates', type: 'json',   required: true },
      {
        name: 'status', type: 'select', required: true,
        values: ['proposed', 'confirmed', 'completed', 'cancelled'], maxSelect: 1,
      },
    ],
    listRule:   "@request.auth.id != ''",
    viewRule:   "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
  });

  await createCollectionIfMissing(pb, 'votes', {
    type: 'base',
    fields: [
      { name: 'route', type: 'text', required: true },
      { name: 'user',  type: 'text', required: true },
      { name: 'going', type: 'bool', required: true },
    ],
    listRule:   "@request.auth.id != ''",
    viewRule:   "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id = user",
    deleteRule: "@request.auth.id = user",
  });
}
