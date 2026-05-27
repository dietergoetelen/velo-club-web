/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    // Public read (any authenticated user), owner-only writes.
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
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text1579384326",
        "max": 0,
        "min": 1,
        "name": "name",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "number1492385349",
        "max": null,
        "min": null,
        "name": "distance_km",
        "onlyInt": false,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "number4217926447",
        "max": null,
        "min": null,
        "name": "elevation_m",
        "onlyInt": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "json2551633526",
        "maxSize": 0,
        "name": "coordinates",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "json"
      },
      {
        "hidden": false,
        "id": "autodate_pr_created",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate_pr_updated",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_personal_routes",
    "indexes": [
      "CREATE INDEX `idx_personal_routes_user` ON `personal_routes` (`user`)"
    ],
    "listRule": "@request.auth.id != ''",
    "name": "personal_routes",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.id = user",
    "viewRule": "@request.auth.id != ''"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_personal_routes");
  return app.delete(collection);
})
