Here is a **GraphHopper 11.x-only** configuration that validates, starts without the LM error, and makes 180° turns expensive enough that the flexible `round_trip` solver stops creating lollipop spurs.

### Why the previous profile was ignored

1. **Wrong nesting.** Since GH 9 `u_turn_costs` is not a top-level profile key. It must live inside a `turn_costs` map. A flat `u_turn_costs: 60` is silently ignored, so the penalty was never applied.
2. **LM + turn costs.** In 11.0 Landmark profiles do not support the new turn-cost features. Adding the bike profile to `profiles_lm` aborts startup with *“The turn_penalty feature is not supported … You have to enable this in 'turn_costs'”*. The fix landed in 12.0.
3. **round_trip is flexible only.** `algorithm=round_trip` requires `ch.disable=true` per request. CH cannot evaluate turn costs for this algorithm.

### 1. config.yml – valid for 11.0 / 11.x

```yaml
graphhopper:
  datareader.file: your-area.osm.pbf
  graph.location: graph-cache

  # encoded values referenced in the custom model
  graph.encoded_values: road_class,road_environment,max_speed,surface,track_type,smoothness,road_access

  profiles:
    - name: road_bike
      vehicle: bike
      weighting: custom
      custom_model_files: [road_bike.json]
      turn_costs:
        u_turn_costs: 300 # seconds; 300 s ≈ 5 min, increase to 600 if U-turns persist
        vehicle_types: [bicycle]

  # round_trip must run flexible; keep both lists empty for this profile in 11
  profiles_ch: []
  profiles_lm: []
```

After **any** change to `graph.encoded_values`, `turn_costs`, or the custom model, delete `graph-cache/` and re-import. `custom_model_files` (plural) is the correct key since GH 9.

### 2. road_bike.json – hard block the edges that force spurs

Place next to `config.yml`. Server-side custom models allow `multiply_by: 0` for a hard block.

```json
{
  "distance_influence": 70,
  "priority": [
    { "if": "road_class == TRACK || road_class == SERVICE || road_class == PATH || road_class == STEPS", "multiply_by": 0 },
    { "if": "surface == GRAVEL || surface == UNPAVED || surface == DIRT || surface == GROUND || surface == SAND", "multiply_by": 0 },
    { "if": "track_type == GRADE4 || track_type == GRADE5", "multiply_by": 0 },
    { "if": "smoothness == BAD || smoothness == VERY_BAD || smoothness == HORRIBLE || smoothness == VERY_HORRIBLE || smoothness == IMPASSABLE", "multiply_by": 0 },
    { "if": "road_access == PRIVATE || road_access == DESTINATION", "multiply_by": 0 }
  ],
  "speed": [
    { "if": "true", "limit_to": "25" }
  ]
}
```

Soft penalties (`0.5`) still let the solver enter a gravel stub to meet the distance target and backtrack. Use `0`. If the network becomes disconnected, replace `0` with `0.01` to `0.05`.

### 3. Round-trip request that avoids the lollipop

Use exactly one point and force flexible mode:

```
GET /route?point=51.25,4.98
  &profile=road_bike
  &ch.disable=true
  &algorithm=round_trip
  &round_trip.distance=30000
  &round_trip.points=5
  &round_trip.seed=42
  &heading=135
  &points_encoded=false
```

- `round_trip.points=4` to `6` spreads the tour. The default `2` creates a triangle `start-p1-p2-start` that reuses the start edge.
- `heading` sets the initial departure bearing and prevents the first via-point from landing behind the start on a dead-end track.
- Generate 3 to 5 seeds (`0, 42, 101…`) and keep the geometry with no duplicated edge IDs.

### 4. Operational checklist to kill remaining U-turns

- Snap the start coordinate to a through junction with degree ≥3 on a paved road before calling the API. Starting mid-block on a degree-2 way forces the first and last leg to use the same edge.
- Keep `road_bike` out of `profiles_ch` and `profiles_lm` in 11.0.
- Rebuild the graph after config changes.
- Use a high U-turn penalty: 300 s removes most discretionary U-turns; 600 s virtually bans them.
- Post-filter candidates: discard any route where the same edge appears twice in opposite direction within the first or last 500 m, or where duplicated length > 5 % of total.

With the nested `turn_costs` block, hard surface blocks, junction snapping, 5 spread via-points, and a 300 s U-turn penalty, the north-side spur around Hooge Mierde / De Vrij disappears and the solver prefers a 200-400 m detour over reversing on the same way.