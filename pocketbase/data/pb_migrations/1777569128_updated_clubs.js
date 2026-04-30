/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1861980104")

  // add field
  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "bool4238328440",
    "name": "schedules_enabled",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1861980104")

  // remove field
  collection.fields.removeById("bool4238328440")

  return app.save(collection)
})
