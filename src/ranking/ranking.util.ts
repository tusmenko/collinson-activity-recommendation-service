import type { DaySignals, Source } from '../weather/index';
import type { RankingInput, SourceDays } from './ranking.types';
import type { Classifier } from './registry/classifier.port';

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

function byDate(days: readonly DaySignals[] | undefined): Map<string, DaySignals> {
  return new Map((days ?? []).map((day) => [day.date, day]));
}

// FORECAST carries every non-wave field, so it is the base; MARINE only when no forecast was served.
function baseDays(days: SourceDays): Map<string, DaySignals> {
  const forecast = byDate(days.FORECAST);
  return forecast.size > 0 ? forecast : byDate(days.MARINE);
}

// One DaySignals per window date: forecast fields from FORECAST, wave fields from MARINE; a date the base
// source did not serve has every non-wave signal null.
export function mergeDays(days: SourceDays, dates: readonly string[]): DaySignals[] {
  const base = baseDays(days);
  const marine = byDate(days.MARINE);
  return dates.map((date) => withMarine(base.get(date) ?? noSignals(date), marine.get(date)));
}

// Window dates the base source did not serve (a partial stored window after a failed refetch); they rank null.
export function unservedDates(days: SourceDays, dates: readonly string[]): ReadonlySet<string> {
  const base = baseDays(days);
  return new Set(dates.filter((date) => !base.has(date)));
}

// A source that failed and left nothing stored; a failed refetch over stored days still ranks.
export function failedSource(classifier: Classifier, input: RankingInput): Source | undefined {
  return classifier.requires.find(
    (source) =>
      (input.days[source]?.length ?? 0) === 0 &&
      input.sources.some((report) => report.source === source && report.status === 'FAILED'),
  );
}
