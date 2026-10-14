# Open-Meteo fixtures, schema version 1

Recorded Open-Meteo responses served by the stub upstream (`test/stub-upstream/server.ts`). Tests never call Open-Meteo; they read these files through the stub. The set is empty in phase 0; phase 1 records it from the spike captures and one live fetch per missing sample.

## Layout

```text
test/fixtures/open-meteo/v1/
  geocoding/<slug>.json   body of /v1/search for one name
  forecast/<slug>.json    body of /v1/forecast for one place
  marine/<slug>.json      body of /v1/marine for one place
```

`<slug>` is the place name in lower case with accents removed and every run of other characters replaced by a hyphen: `Springfield` becomes `springfield`, `Vitória` becomes `vitoria`.

## How the stub picks a file

- Geocoding: by the slug of the `name` query parameter. A name with no file gets a body without a `results` key, which is what Open-Meteo returns for an unknown name.
- Forecast and marine: the file whose top-level `latitude` and `longitude` are nearest to the request's. No file at all gives a 404.

## Fault behaviours

Selected per request by the `x-stub-behaviour` header or the `stub` query parameter: `ok` (default), `timeout` (holds the response for 5 s), `http500`, `malformed` (drops `daily`, and `latitude` from each geocoding result), `nulls` (marine series set to null, as for an inland point), `slow` (300 ms, then `ok`).

## Recording rules

Store the body exactly as Open-Meteo returned it, pretty-printed. Note the request URL and the recording date in the commit message. A change in the upstream payload shape is a new schema version directory, not an edit in place.
