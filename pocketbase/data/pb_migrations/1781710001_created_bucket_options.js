/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "@request.auth.id != ''",
    "deleteRule": "@request.auth.id != ''",
    "listRule":   "@request.auth.id != ''",
    "updateRule": "@request.auth.id != ''",
    "viewRule":   "@request.auth.id != ''",
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      { "id": "text_bucket",   "name": "bucket",   "type": "text", "required": true, "system": false, "hidden": false, "presentable": false, "primaryKey": false, "min": 0, "max": 0, "pattern": "", "autogeneratePattern": "" },
      { "id": "text_route",    "name": "route",    "type": "text", "required": true, "system": false, "hidden": false, "presentable": false, "primaryKey": false, "min": 0, "max": 0, "pattern": "", "autogeneratePattern": "" },
      { "id": "text_added_by", "name": "added_by", "type": "text", "required": true, "system": false, "hidden": false, "presentable": false, "primaryKey": false, "min": 0, "max": 0, "pattern": "", "autogeneratePattern": "" },
      { "id": "autodate_created", "name": "created", "type": "autodate", "onCreate": true, "onUpdate": false, "system": false, "hidden": false, "presentable": false }
    ],
    "id": "pbc_bucket_options",
    // A route can only be a candidate once per bucket.
    "indexes": [
      "CREATE UNIQUE INDEX `idx_bucket_options_bucket_route` ON `bucket_options` (`bucket`, `route`)"
    ],
    "name": "bucket_options",
    "system": false,
    "type": "base"
  });

  return app.save(collection);
}, (app) => {
  return app.delete(app.findCollectionByNameOrId("pbc_bucket_options"));
})
