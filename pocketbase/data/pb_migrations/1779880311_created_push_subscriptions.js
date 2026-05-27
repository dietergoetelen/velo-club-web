/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    // Owner-only writes; server fetches these by user.id when sending pushes.
    "createRule": "@request.auth.id != '' && @request.auth.id = user",
    "deleteRule": "@request.auth.id = user",
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
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text2375276105",
        "max": 0,
        "min": 0,
        "name": "user",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        // Push service URL — uniquely identifies a browser/device pair.
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_endpoint",
        "max": 0,
        "min": 1,
        "name": "endpoint",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        // Subscription's P-256 ECDH public key.
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_p256dh",
        "max": 0,
        "min": 1,
        "name": "p256dh",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        // HMAC auth secret.
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_auth",
        "max": 0,
        "min": 1,
        "name": "auth",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "autodate_ps_created",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate_ps_updated",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_push_subscriptions",
    "indexes": [
      "CREATE UNIQUE INDEX `idx_push_endpoint` ON `push_subscriptions` (`endpoint`)",
      "CREATE INDEX `idx_push_user` ON `push_subscriptions` (`user`)"
    ],
    "listRule": "@request.auth.id = user",
    "name": "push_subscriptions",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.id = user",
    "viewRule": "@request.auth.id = user"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_push_subscriptions");
  return app.delete(collection);
});
