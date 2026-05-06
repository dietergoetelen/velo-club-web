/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1861980104")

  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_clubs_name` ON `clubs` (`name`)",
      "CREATE UNIQUE INDEX `idx_clubs_slug` ON `clubs` (`slug`)"
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1861980104")

  unmarshal({
    "indexes": []
  }, collection)

  return app.save(collection)
})
