/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    // Superuser-only: written exclusively by the cron handler (admin auth),
    // never by end users. Locking every rule keeps it off the public API.
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
        "id": "text46407801",
        "max": 0,
        "min": 0,
        "name": "route",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "select_stage",
        "maxSelect": 1,
        "name": "stage",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "t24",
          "t2"
        ]
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
    "id": "pbc_reminder_log",
    // The unique (route, stage) pair is the idempotency lock: the cron handler
    // claims a reminder by creating the row, and a duplicate create fails here.
    "indexes": [
      "CREATE UNIQUE INDEX `idx_reminder_log_route_stage` ON `reminder_log` (`route`, `stage`)"
    ],
    "name": "reminder_log",
    "system": false,
    "type": "base"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_reminder_log");

  return app.delete(collection);
})
