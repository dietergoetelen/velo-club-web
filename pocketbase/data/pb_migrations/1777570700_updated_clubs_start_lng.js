/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1861980104")

  collection.fields.addAt(7, new Field({
    "hidden": false,
    "id": "number2573802292",
    "max": null,
    "min": null,
    "name": "start_lng",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1861980104")

  collection.fields.removeById("number2573802292")

  return app.save(collection)
})
