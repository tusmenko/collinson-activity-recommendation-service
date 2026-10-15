import type { LocationFacts } from '../../src/location/index.js';
import type { RankingInput } from '../../src/ranking/index.js';
import type { DaySignals } from '../../src/weather/index.js';
import { normaliseForecastPayload } from '../../src/weather/open-meteo-forecast.adapter.js';
import { normaliseMarinePayload } from '../../src/weather/open-meteo-marine.adapter.js';
import { FIXED_NOW } from './fixed-clock.js';
import { loadFixture } from './fixtures.js';

// Recorded places; the archive entry is Chamonix 2026-01-10 to 17 and has no marine body.
const PLACES = {
  chamonix: { forecast: 'forecast/chamonix', marine: 'marine/chamonix' },
  'chamonix-january': { forecast: 'archive/chamonix-2026-01-10', marine: null },
  hintertux: { forecast: 'forecast/hintertux', marine: null },
  biarritz: { forecast: 'forecast/biarritz', marine: 'marine/biarritz' },
  dubai: { forecast: 'forecast/dubai', marine: 'marine/dubai' },
  london: { forecast: 'forecast/london', marine: 'marine/london' },
  springfield: { forecast: 'forecast/springfield', marine: 'marine/springfield' },
} as const;

export type Place = keyof typeof PLACES;

function normalised(
  path: string,
  normalise: (payload: unknown) => DaySignals[] | null,
): DaySignals[] {
  const days = normalise(loadFixture(`open-meteo/v1/${path}.json`));
  if (days === null) {
    throw new Error(`Fixture ${path} does not match the adapter schema`);
  }
  return days;
}

function facts(place: Place): LocationFacts {
  const body = loadFixture(`open-meteo/v1/${PLACES[place].forecast}.json`) as {
    latitude: number;
    longitude: number;
    timezone: string;
  };
  return {
    id: place,
    name: place,
    country: 'fixture',
    latitude: body.latitude,
    longitude: body.longitude,
    timezone: body.timezone,
    marineDataAvailable: 'unknown',
    updatedAt: FIXED_NOW.toISOString(),
  };
}

// A ranking input built from the recorded bodies through the adapters' own normalisation.
export function rankingInput(place: Place, overrides: Partial<RankingInput> = {}): RankingInput {
  const { forecast, marine } = PLACES[place];
  const fetchedAt = FIXED_NOW.toISOString();
  return {
    location: facts(place),
    activities: [],
    days: {
      FORECAST: normalised(forecast, normaliseForecastPayload),
      ...(marine === null ? {} : { MARINE: normalised(marine, normaliseMarinePayload) }),
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
