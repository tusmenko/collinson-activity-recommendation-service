import { describe, expect, it } from 'vitest';

import { rankingInput } from '../../test/setup/ranking-input';
import type { Place } from '../../test/setup/ranking-input';
import { rankingHarness } from '../../test/setup/ranking-service';
import type { DaySignals } from '../weather/index';
import { UnknownActivityError } from './ranking.errors';
import type { ClassifierOutput, DayScore } from './ranking.types';
import type { Classifier } from './registry/classifier.port';
import outdoorRules from './classifiers/outdoor-sightseeing/outdoor-sightseeing.rules.json' with { type: 'json' };

const BUILT_IN = ['SKIING', 'SURFING', 'OUTDOOR_SIGHTSEEING', 'INDOOR_SIGHTSEEING'];
const PLACES: readonly Place[] = [
  'chamonix',
  'hintertux',
  'biarritz',
  'dubai',
  'london',
  'springfield',
];

// A classifier written as a plain object, the way a new activity or a model-backed one would plug in; its rule file
// reuses the outdoor thresholds under its own version.
function fakeClassifier(
  id: string,
  output: (days: readonly DaySignals[]) => ClassifierOutput,
): Classifier {
  return {
    id,
    version: '0.1.0',
    requires: ['FORECAST'],
    ruleFile: { ...outdoorRules, version: '0.1.0' },
    score: async ({ days }) => {
      await Promise.resolve();
      return output(days);
    },
  };
}

function scored(days: readonly DaySignals[], score: number | null): DayScore[] {
  return days.map((day) => ({ date: day.date, score, factors: [] }));
}

describe('RankingService.rank', () => {
  it('U-RANK-1 every applicable activity has exactly WINDOW_DAYS dated scores in date order', async () => {
    const { service } = rankingHarness();

    const { rankings } = await service.rank(rankingInput('biarritz'));

    expect(rankings.map((ranking) => ranking.activity)).toEqual(BUILT_IN);
    for (const ranking of rankings.filter((entry) => entry.status === 'APPLICABLE')) {
      expect(ranking.days.map((day) => day.date)).toEqual([
        '2026-10-15',
        '2026-10-16',
        '2026-10-17',
        '2026-10-18',
        '2026-10-19',
        '2026-10-20',
        '2026-10-21',
      ]);
    }
  });

  it('U-RANK-3 every score of every golden place lies within 0 to 100 and no anomaly is counted', async () => {
    const { service, lines } = rankingHarness();

    const results = await Promise.all(PLACES.map((place) => service.rank(rankingInput(place))));

    const scores = results.flatMap(({ rankings }) =>
      rankings.flatMap((ranking) => ranking.days.map((day) => day.score)),
    );
    expect(scores.filter((score) => score !== null && (score < 0 || score > 100))).toEqual([]);
    expect(lines().filter((line) => line.level === 40)).toEqual([]);
  });

  it('U-RANK-1 each ranked day carries the merged signals of its date', async () => {
    const { service } = rankingHarness();

    const { rankings } = await service.rank({
      ...rankingInput('biarritz'),
      activities: ['SURFING'],
    });

    expect(rankings[0]?.days[0]?.signals).toMatchObject({
      date: '2026-10-15',
      tempMax: 26.8,
      waveHeight: 1.68,
      wavePeriod: 12.35,
    });
  });

  it('U-RANK-1 a date missing from the marine days leaves its wave fields null', async () => {
    const { service } = rankingHarness();
    const input = rankingInput('biarritz');
    const marine = (input.days.MARINE ?? []).filter((day) => day.date !== '2026-10-16');

    const { rankings } = await service.rank({
      ...input,
      activities: ['SURFING'],
      days: { ...input.days, MARINE: marine },
    });

    expect(rankings[0]?.days[1]?.signals).toMatchObject({
      date: '2026-10-16',
      waveHeight: null,
      wavePeriod: null,
      swellHeight: null,
    });
  });

  it('U-RANK-1 with no forecast days the marine dates are the window', async () => {
    const { service } = rankingHarness();
    const input = rankingInput('biarritz');

    const { rankings } = await service.rank({
      ...input,
      activities: ['SURFING'],
      days: { MARINE: input.days.MARINE ?? [] },
    });

    expect(rankings[0]?.days).toHaveLength(7);
    expect(rankings[0]?.status).toBe('APPLICABLE');
  });

  it('U-RANK-15 a window date no source served keeps its place with a null score and null signals', async () => {
    const steady = fakeClassifier('CYCLING', (days) => ({
      status: 'APPLICABLE',
      days: scored(days, 50),
    }));
    const { service } = rankingHarness([steady]);
    const input = rankingInput('biarritz');
    const forecast = (input.days.FORECAST ?? []).filter((day) => day.date !== '2026-10-17');

    const { rankings } = await service.rank({
      ...input,
      activities: ['OUTDOOR_SIGHTSEEING', 'CYCLING'],
      days: { FORECAST: forecast },
    });

    for (const ranking of rankings) {
      expect(ranking.days.map((day) => day.date)).toEqual(input.dates);
      expect(ranking.days[2]).toMatchObject({
        date: '2026-10-17',
        score: null,
        factors: [],
        signals: { tempMax: null },
      });
      expect(ranking.days[3]?.score).not.toBeNull();
    }
  });

  it('U-RANK-1 the requested activities come back in the requested order only', async () => {
    const { service } = rankingHarness();

    const { rankings } = await service.rank({
      ...rankingInput('london'),
      activities: ['INDOOR_SIGHTSEEING', 'SKIING'],
    });

    expect(rankings.map((ranking) => ranking.activity)).toEqual(['INDOOR_SIGHTSEEING', 'SKIING']);
  });

  it('U-RANK-4 a fifth classifier registered on the registry is ranked with no other change', async () => {
    const cycling = fakeClassifier('CYCLING', (days) => ({
      status: 'APPLICABLE',
      days: scored(days, 70),
    }));
    const { service } = rankingHarness([cycling]);

    const { rankings, ruleSetVersion } = await service.rank(rankingInput('london'));

    expect(rankings.map((ranking) => ranking.activity)).toEqual([...BUILT_IN, 'CYCLING']);
    expect(rankings.at(-1)).toMatchObject({ status: 'APPLICABLE', classifierVersion: '0.1.0' });
    expect(rankings.at(-1)?.days.map((day) => day.score)).toEqual([70, 70, 70, 70, 70, 70, 70]);
    expect(ruleSetVersion).toMatch(/\+CYCLING@0\.1\.0$/);
  });

  it('U-RANK-5 an asynchronous classifier is accepted and awaited', async () => {
    const llm = fakeClassifier('CYCLING', (days) => ({
      status: 'NOT_APPLICABLE',
      reason: 'model says no',
      days: scored(days, null),
    }));
    const { service } = rankingHarness([llm]);

    const { rankings } = await service.rank({ ...rankingInput('london'), activities: ['CYCLING'] });

    expect(rankings[0]).toMatchObject({ status: 'NOT_APPLICABLE', reason: 'model says no' });
  });

  it('U-RANK-9 an unknown activity throws UnknownActivityError', async () => {
    const { service } = rankingHarness();

    const failure = service.rank({ ...rankingInput('london'), activities: ['BASE_JUMPING'] });

    await expect(failure).rejects.toBeInstanceOf(UnknownActivityError);
    await expect(failure).rejects.toMatchObject({ activity: 'BASE_JUMPING' });
  });

  it('U-RANK-10 a failed marine source makes surfing UNAVAILABLE with null scores and a reason', async () => {
    const { service } = rankingHarness();
    const input = rankingInput('biarritz');

    const { rankings } = await service.rank({
      ...input,
      days: { FORECAST: input.days.FORECAST ?? [] },
      sources: [
        { source: 'FORECAST', status: 'OK', fetchedAt: input.fetchedAt },
        { source: 'MARINE', status: 'FAILED', fetchedAt: null },
      ],
    });

    const surfing = rankings.find((ranking) => ranking.activity === 'SURFING');
    expect(surfing).toMatchObject({ status: 'UNAVAILABLE', reason: 'MARINE source failed' });
    expect(surfing?.days).toHaveLength(7);
    expect(surfing?.days.every((day) => day.score === null && day.factors.length === 0)).toBe(true);
    const others = rankings.filter((ranking) => ranking.activity !== 'SURFING');
    expect(others.every((ranking) => ranking.status !== 'UNAVAILABLE')).toBe(true);
  });

  it('U-RANK-10 a failed marine refetch with stored marine days still scores surfing', async () => {
    const { service } = rankingHarness();
    const input = rankingInput('biarritz');

    const { rankings } = await service.rank({
      ...input,
      activities: ['SURFING'],
      sources: [
        { source: 'FORECAST', status: 'OK', fetchedAt: input.fetchedAt },
        { source: 'MARINE', status: 'FAILED', fetchedAt: input.fetchedAt },
      ],
    });

    expect(rankings[0]?.status).toBe('APPLICABLE');
  });
});

describe('RankingService classifier dates', () => {
  it('U-RANK-1 a date a classifier returns outside the window carries all-null signals', async () => {
    const stray = fakeClassifier('CYCLING', (days) => ({
      status: 'APPLICABLE',
      days: [...scored(days.slice(0, 6), 50), { date: '2030-01-01', score: 50, factors: [] }],
    }));
    const { service } = rankingHarness([stray]);

    const { rankings } = await service.rank({ ...rankingInput('london'), activities: ['CYCLING'] });

    expect(rankings[0]?.days[6]?.signals).toMatchObject({
      date: '2030-01-01',
      tempMax: null,
      waveHeight: null,
    });
  });
});

describe('RankingService events and invariants', () => {
  it('U-EVENT-1 one ranking event carries provider, fetched-at per source, versions and factors', async () => {
    const { service, lines } = rankingHarness();

    await service.rank({ ...rankingInput('biarritz'), activities: ['SURFING'] });

    const events = lines().filter((line) => line.event === 'ranking');
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      level: 30,
      requestId: 'test-biarritz',
      locationId: 'biarritz',
      provider: 'open-meteo',
      fetchedAt: { FORECAST: '2026-10-15T06:00:00.000Z', MARINE: '2026-10-15T06:00:00.000Z' },
      ruleSetVersion:
        'v1+SKIING@1.1.0+SURFING@1.1.0+OUTDOOR_SIGHTSEEING@1.0.0+INDOOR_SIGHTSEEING@1.1.0',
      activities: [
        {
          classifierId: 'SURFING',
          classifierVersion: '1.1.0',
          status: 'APPLICABLE',
          reason: null,
        },
      ],
    });
    const [surfing] = (events[0]?.activities ?? []) as {
      days: { date: string; score: number; factors: { signal: string }[] }[];
    }[];
    expect(surfing?.days).toHaveLength(7);
    expect(surfing?.days[0]?.factors.map((factor) => factor.signal)).toEqual([
      'waveHeight',
      'wavePeriod',
      'windMax',
    ]);
  });

  it('U-EVENT-2 a score of 101 logs at warn and increments score_out_of_range', async () => {
    const broken = fakeClassifier('CYCLING', (days) => ({
      status: 'APPLICABLE',
      days: scored(days, 101),
    }));
    const { service, counter, lines } = rankingHarness([broken]);

    await service.rank({ ...rankingInput('london'), activities: ['CYCLING'] });

    expect(counter.count('score_out_of_range')).toBe(1);
    const warnings = lines().filter((line) => line.level === 40 && line.metric === undefined);
    expect(warnings).toEqual([
      expect.objectContaining({ type: 'score_out_of_range', activity: 'CYCLING' }),
    ]);
  });

  it('U-EVENT-2 an applicable activity with too few days or a missing score is counted', async () => {
    const short = fakeClassifier('CYCLING', (days) => ({
      status: 'APPLICABLE',
      days: [...scored(days.slice(0, 5), 50), ...scored(days.slice(5, 6), null)],
    }));
    const { service, counter } = rankingHarness([short]);

    await service.rank({ ...rankingInput('london'), activities: ['CYCLING'] });

    expect(counter.count('window_mismatch')).toBe(1);
    expect(counter.count('missing_score')).toBe(1);
  });

  it('U-EVENT-2 days out of date order are a window mismatch', async () => {
    const reversed = fakeClassifier('CYCLING', (days) => ({
      status: 'APPLICABLE',
      days: scored([...days].reverse(), 50),
    }));
    const { service, counter } = rankingHarness([reversed]);

    await service.rank({ ...rankingInput('london'), activities: ['CYCLING'] });

    expect(counter.count('window_mismatch')).toBe(1);
  });

  it('U-EVENT-2 a score on a not-applicable activity is counted', async () => {
    const scoredAnyway = fakeClassifier('CYCLING', (days) => ({
      status: 'NOT_APPLICABLE',
      reason: 'no bikes',
      days: scored(days, 10),
    }));
    const { service, counter } = rankingHarness([scoredAnyway]);

    await service.rank({ ...rankingInput('london'), activities: ['CYCLING'] });

    expect(counter.count('score_without_applicability')).toBe(1);
  });

  it('U-EVENT-3 a marine availability change logs one marine_availability_changed event', () => {
    const { service, lines } = rankingHarness();
    const { location } = rankingInput('london');

    service.noteMarineAvailability(location, 'unknown', 'absent');
    service.noteMarineAvailability(location, 'absent', 'absent');

    expect(lines().filter((line) => line.event === 'marine_availability_changed')).toEqual([
      expect.objectContaining({ locationId: 'london', previous: 'unknown', next: 'absent' }),
    ]);
  });
});
