/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    // Superuser-only. Tokens are resolved server-side (the /join route and the
    // captain actions use admin auth), never exposed on the public API — a
    // listable invites table would leak join tokens to every member.
    "createRule": null,
    "deleteRule": null,
    "listRule":   null,
    "updateRule": null,
    "viewRule":   null,
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
        "id": "text_token",
        "max": 0,
        "min": 0,
        "name": "token",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_club",
        "max": 0,
        "min": 0,
        "name": "club",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_created_by",
        "max": 0,
        "min": 0,
        "name": "created_by",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "autodate_created",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_invites",
    // One invite per club (regenerating rotates the token in place); token is
    // the public lookup key, so it's unique too.
    "indexes": [
      "CREATE UNIQUE INDEX `idx_invites_token` ON `invites` (`token`)",
      "CREATE UNIQUE INDEX `idx_invites_club` ON `invites` (`club`)"
    ],
    "name": "invites",
    "system": false,
    "type": "base"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_invites");

  return app.delete(collection);
})
