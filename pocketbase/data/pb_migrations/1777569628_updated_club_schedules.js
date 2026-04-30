/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3118008831")

  // update field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "number111645041",
    "max": 6,
    "min": 0,
    "name": "day_of_week",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3118008831")

  // update field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "number111645041",
    "max": 6,
    "min": 0,
    "name": "day_of_week",
    "onlyInt": true,
    "presentable": false,
    "required": true,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
})
