/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_527446907")

  // remove field
  collection.fields.removeById("text614609615")

  // remove field
  collection.fields.removeById("email89163564")

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_527446907")

  // add field
  collection.fields.addAt(3, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text614609615",
    "max": 0,
    "min": 0,
    "name": "user_name",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "exceptDomains": null,
    "hidden": false,
    "id": "email89163564",
    "name": "user_email",
    "onlyDomains": null,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "email"
  }))

  return app.save(collection)
})
