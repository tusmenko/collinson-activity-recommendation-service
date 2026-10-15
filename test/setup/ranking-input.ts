import type { ZodType } from 'zod';

import { ForecastPayloadSchema, MarinePayloadSchema } from '../../src/infra/index';
import type { LocationFacts } from '../../src/location/index';
import type { RankingInput } from '../../src/ranking/index';
import type { DaySignals } from '../../src/weather/index';
import { toDaySignals as forecastDays } from '../../src/weather/sources/forecast/open-meteo-forecast.util';
import { toDaySignals as marineDays } from '../../src/weather/sources/marine/open-meteo-marine.util';
import { testConfig } from './adapter-deps';
import { FIXED_NOW } from './fixed-clock';
import { loadFixture } from './fixtures';

// Recorded places; the archive entry is Chamonix 2026-01-10 to 17 and has no marine body.
// Elevation comes from the recorded geocoding body, as it does in the app (A-8).
const PLACES = {
  chamonix: { geocoding: 'chamonix', forecast: 'forecast/chamonix', marine: 'marine/chamonix' },
  'chamonix-january': {
    geocoding: 'chamonix',
    forecast: 'archive/chamonix-2026-01-10',
    marine: null,
  },
  hintertux: { geocoding: 'hintertux', forecast: 'forecast/hintertux', marine: null },
  biarritz: { geocoding: 'biarritz', forecast: 'forecast/biarritz', marine: 'marine/biarritz' },
  dubai: { geocoding: 'dubai', forecast: 'forecast/dubai', marine: 'marine/dubai' },
  london: { geocoding: 'london', forecast: 'forecast/london', marine: 'marine/london' },
  springfield: {
    geocoding: 'springfield',
    forecast: 'forecast/springfield',
    marine: 'marine/springfield',
  },
} as const;

export type Place = keyof typeof PLACES;

// The recorded body through the client's pinned schema and the adapter's translation; throws on a schema mismatch.
function normalised<Payload>(
  path: string,
  schema: ZodType<Payload>,
  toDays: (payload: Payload) => DaySignals[],
): DaySignals[] {
  return toDays(schema.parse(loadFixture(`open-meteo/v1/${path}.json`)));
}

function facts(place: Place): LocationFacts {
  const body = loadFixture(`open-meteo/v1/${PLACES[place].forecast}.json`) as {
    latitude: number;
    longitude: number;
    timezone: string;
  };
  const geocoding = loadFixture(`open-meteo/v1/geocoding/${PLACES[place].geocoding}.json`) as {
    results: { elevation: number }[];
  };
  return {
    id: place,
    name: place,
    country: 'fixture',
    latitude: body.latitude,
    longitude: body.longitude,
    timezone: body.timezone,
    ...(geocoding.results[0] === undefined ? {} : { elevation: geocoding.results[0].elevation }),
    marineDataAvailable: 'unknown',
    updatedAt: FIXED_NOW.toISOString(),
  };
}

// A ranking input built from the recorded bodies through the adapters' own normalisation.
export function rankingInput(place: Place, overrides: Partial<RankingInput> = {}): RankingInput {
  const { forecast, marine } = PLACES[place];
  const fetchedAt = FIXED_NOW.toISOString();
  const forecastSignals = normalised(forecast, ForecastPayloadSchema, forecastDays);
  return {
    location: facts(place),
    activities: [],
    // The recorded body starts on the window's first day; it holds FETCH_DAYS, the window WINDOW_DAYS.
    dates: forecastSignals.slice(0, testConfig().get('WINDOW_DAYS')).map((day) => day.date),
    days: {
      FORECAST: forecastSignals,
      ...(marine === null ? {} : { MARINE: normalised(marine, MarinePayloadSchema, marineDays) }),
    },
    sources: [
      { source: 'FORECAST', status: 'OK', fetchedAt },
      marine === null
        ? { source: 'MARINE', status: 'SKIPPED', fetchedAt: null }
        : { source: 'MARINE', status: 'OK', fetchedAt },
    ],
    fetchedAt,
    requestId: `test-${place}`,
    ...overrides,
  };
}
