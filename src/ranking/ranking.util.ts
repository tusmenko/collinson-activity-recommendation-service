import type { DaySignals, Source } from '../weather/index.js';
import type { RankingInput, SourceDays } from './ranking.types.js';
import type { Classifier } from './registry/classifier.port.js';

// For a date a classifier returned outside the window; the invariants report it.
export function noSignals(date: string): DaySignals {
  return {
    date,
    tempMax: null,
    tempMin: null,
    precipitation: null,
    precipitationProbability: null,
    snowfall: null,
    snowDepth: null,
    windMax: null,
    windGusts: null,
    cloudCover: null,
    uvIndex: null,
    sunshineHours: null,
    visibility: null,
    weatherCode: null,
    waveHeight: null,
    wavePeriod: null,
    swellHeight: null,
  };
}

function withMarine(day: DaySignals, marine: DaySignals | undefined): DaySignals {
  return {
    ...day,
    waveHeight: marine?.waveHeight ?? null,
    wavePeriod: marine?.wavePeriod ?? null,
    swellHeight: marine?.swellHeight ?? null,
  };
}

// One DaySignals per date: forecast fields from FORECAST, wave fields from MARINE, first WINDOW_DAYS dates.
export function mergeDays(days: SourceDays, windowDays: number): DaySignals[] {
  const marine = new Map((days.MARINE ?? []).map((day) => [day.date, day]));
  const forecast = days.FORECAST ?? [];
  const base = forecast.length > 0 ? forecast : (days.MARINE ?? []);
  return [...base]
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(0, windowDays)
    .map((day) => withMarine(day, marine.get(day.date)));
}

// A source that failed and left nothing stored; a failed refetch over stored days still ranks.
export function failedSource(classifier: Classifier, input: RankingInput): Source | undefined {
  return classifier.requires.find(
    (source) =>
      (input.days[source]?.length ?? 0) === 0 &&
      input.sources.some((report) => report.source === source && report.status === 'FAILED'),
  );
}
