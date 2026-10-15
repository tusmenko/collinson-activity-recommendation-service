# Open-Meteo fixtures, schema version 1

Recorded Open-Meteo responses served by the stub upstream (`test/stub-upstream/server.ts`). Tests never call Open-Meteo; they read these files through the stub, or directly through `loadFixture` in `test/setup/fixtures.ts`.

## The recorded set

Recorded live on 2026-10-15 with exactly the requests the adapters make, and stored byte for byte as Open-Meteo returned them (prettier ignores this folder). Do not edit a file; re-record it.

| Folder | Files | Request |
| --- | --- | --- |
| `geocoding/` | biarritz, chamonix, dubai, hintertux, london, newcastle, springfield, victoria, xyzzyqq | `GET {UPSTREAM_BASE_URL}/v1/search?name=<name>&count=5&language=en&format=json` |
| `forecast/` | biarritz, chamonix, dubai, hintertux, london, springfield | `GET {UPSTREAM_BASE_URL}/v1/forecast?latitude=&longitude=&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,cloud_cover_mean,uv_index_max,sunshine_duration,visibility_mean&hourly=snow_depth&forecast_days=8&timezone=auto` |
| `marine/` | biarritz, chamonix, dubai, london, springfield | `GET {UPSTREAM_BASE_URL}/v1/marine?latitude=&longitude=&daily=wave_height_max,wave_period_max,swell_wave_height_max&forecast_days=8&timezone=auto` |
| `archive/` | chamonix-2026-01-10 | the forecast's daily and hourly variables from the archive endpoint, 2026-01-10 to 2026-01-17; not served by the stub, read by the phase 3 golden tests |

Facts the tests rely on: Springfield has five US results with Missouri first; Victoria's first hit is Vitória (Brazil) and its second Victoria (Canada); Victoria, Hong Kong has no `country` field; Xyzzyqq has no `results` key; Hintertux hourly `snow_depth` peaks at 0.39 m, Chamonix is 0 throughout; London, Chamonix and Springfield marine series are all null; Biarritz wave heights run 1.2 to 2.0 m with periods 9.1 to 14.45 s; the archive has null `precipitation_probability_max`, `uv_index_max` and `visibility_mean`, which is why every series element in the schemas is nullable. Springfield's forecast and marine start on 2026-10-14, the rest on 2026-10-15.

## Layout

```text
test/fixtures/open-meteo/v1/
  geocoding/<slug>.json   body of /v1/search for one name
  forecast/<slug>.json    body of /v1/forecast for one place
  marine/<slug>.json      body of /v1/marine for one place
  archive/<slug>-<date>.json  archive body, unit tests only
```

`<slug>` is the place name in lower case with accents removed and every run of other characters replaced by a hyphen: `Springfield` becomes `springfield`, `Vitória` becomes `vitoria`.

## How the stub picks a file

- Geocoding: by the slug of the `name` query parameter. A name with no file gets a body without a `results` key, which is what Open-Meteo returns for an unknown name.
- Forecast and marine: the file whose top-level `latitude` and `longitude` are nearest to the request's, by straight-line distance in degrees, if it is within 0.5 degrees. Otherwise 404.
- Dates: served as recorded. With `STUB_SHIFT_DATES=1` (set in the stub's Dockerfile and the Compose `demo` profile, never in tests) `daily.time` and `hourly.time` move so the first day is today's UTC date; the day count and values stay.

## Fault behaviours

Selected per request by the `x-stub-behaviour` header, a `/stub/<behaviour>` path prefix (so a client whose base URL is configurable can pick one), or the `stub` query parameter, in that order: `ok` (default), `timeout` (holds the response for 5 s), `http500`, `malformed` (forecast drops `daily.temperature_2m_max`, marine drops `daily.wave_height_max`, geocoding answers `{"results":[{"name":1}]}`), `nulls` (marine series set to null, as for an inland point), `slow` (300 ms, then `ok`).

## Recording rules

Store the body exactly as Open-Meteo returned it. Note the request URL and the recording date here and in the commit message. A change in the upstream payload shape is a new schema version directory, not an edit in place.
