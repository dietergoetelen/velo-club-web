/// <reference path="../pb_data/types.d.ts" />
// Corrective migration. The original `created_personal_routes` migration
// forgot to declare `created` / `updated` autodate fields, so dev DBs that
// applied the original have a schema without those columns. PB won't
// re-apply the original (already in the _migrations table), so this
// migration patches existing installs.
//
// Fresh installs already get the columns from the (now-fixed) original
// migration — for them, this one is a no-op because the fields already
// exist with these ids. We guard against that with try/catch.

migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_personal_routes");

  // Add `created` if not already present.
  try {
    collection.fields.addAt(collection.fields.length, new Field({
      "hidden":     false,
      "id":         "autodate_pr_created",
      "name":       "created",
      "onCreate":   true,
      "onUpdate":   false,
      "presentable": false,
      "system":     false,
      "type":       "autodate",
    }));
  } catch { /* field already exists from the fixed original — ignore */ }

  try {
    collection.fields.addAt(collection.fields.length, new Field({
      "hidden":     false,
      "id":         "autodate_pr_updated",
      "name":       "updated",
      "onCreate":   true,
      "onUpdate":   true,
      "presentable": false,
      "system":     false,
      "type":       "autodate",
    }));
  } catch { /* field already exists — ignore */ }

  app.save(collection);

  // Backfill: rows saved before the columns existed will have NULL/empty
  // `created` / `updated`. Stamp them with the current time so the
  // dashboard's `-created` sort has something to work with.
  try {
    app.db().newQuery(
      "UPDATE personal_routes SET created = datetime('now'), updated = datetime('now') " +
      "WHERE created IS NULL OR created = ''"
    ).execute();
  } catch { /* table may not have the rows yet on fresh installs */ }

  return null;
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_personal_routes");
  try { collection.fields.removeById("autodate_pr_created"); } catch { /* ignore */ }
  try { collection.fields.removeById("autodate_pr_updated"); } catch { /* ignore */ }
  return app.save(collection);
});
