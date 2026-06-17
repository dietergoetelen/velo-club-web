/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    // Authed members read; writes go through server actions (captain checks)
    // or the close cron (admin). Consistent with clubs/routes rules.
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
      { "id": "text_club",        "name": "club",        "type": "text",  "required": true,  "system": false, "hidden": false, "presentable": false, "primaryKey": false, "min": 0, "max": 0, "pattern": "", "autogeneratePattern": "" },
      { "id": "date_ride",        "name": "ride_date",   "type": "date",  "required": true,  "system": false, "hidden": false, "presentable": false, "min": "", "max": "" },
      { "id": "date_closes",      "name": "closes_at",   "type": "date",  "required": true,  "system": false, "hidden": false, "presentable": false, "min": "", "max": "" },
      {
        "id": "select_status", "name": "status", "type": "select", "required": true, "system": false, "hidden": false, "presentable": false,
        "maxSelect": 1, "values": ["open", "closed"]
      },
      { "id": "text_created_by",  "name": "created_by",   "type": "text", "required": true,  "system": false, "hidden": false, "presentable": false, "primaryKey": false, "min": 0, "max": 0, "pattern": "", "autogeneratePattern": "" },
      { "id": "text_winning",     "name": "winning_route","type": "text", "required": false, "system": false, "hidden": false, "presentable": false, "primaryKey": false, "min": 0, "max": 0, "pattern": "", "autogeneratePattern": "" },
      { "id": "text_created_ride","name": "created_ride", "type": "text", "required": false, "system": false, "hidden": false, "presentable": false, "primaryKey": false, "min": 0, "max": 0, "pattern": "", "autogeneratePattern": "" },
      { "id": "autodate_created", "name": "created", "type": "autodate", "onCreate": true, "onUpdate": false, "system": false, "hidden": false, "presentable": false }
    ],
    "id": "pbc_route_buckets",
    "indexes": [],
    "name": "route_buckets",
    "system": false,
    "type": "base"
  });

  return app.save(collection);
}, (app) => {
  return app.delete(app.findCollectionByNameOrId("pbc_route_buckets"));
})
