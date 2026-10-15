import { describe, expect, it } from 'vitest';

import { rankingInput } from '../../test/setup/ranking-input';
import type { Place } from '../../test/setup/ranking-input';
import { rankingHarness } from '../../test/setup/ranking-service';
import type { ActivityRanking } from './ranking.types';

// Golden set (H-1): recorded Open-Meteo days through the adapters' normalisation and the real rule files.
async function ranking(place: Place, activity: string): Promise<ActivityRanking> {
  const { service } = rankingHarness();
  const { rankings } = await service.rank({ ...rankingInput(place), activities: [activity] });
  const [found] = rankings;
  if (found === undefined) {
    throw new Error(`No ${activity} ranking for ${place}`);
  }
  return found;
}

function scores(entry: ActivityRanking): (number | null)[] {
  return entry.days.map((day) => day.score);
}

function scoreOn(entry: ActivityRanking, date: string): number | null {
  return entry.days.find((day) => day.date === date)?.score ?? null;
}

describe('golden set: skiing', () => {
  it('U-SKI-1 Chamonix in October is NOT_APPLICABLE and the reason names snow depth', async () => {
    const skiing = await ranking('chamonix', 'SKIING');

    expect(skiing).toMatchObject({
      status: 'NOT_APPLICABLE',
      reason: 'snow depth below 5 cm on every day (max 0 cm)',
    });
    expect(scores(skiing).every((score) => score === null)).toBe(true);
  });

  it('U-SKI-2 Hintertux at 39 cm is APPLICABLE and its best day scores at least 60', async () => {
    const skiing = await ranking('hintertux', 'SKIING');

    expect(skiing.status).toBe('APPLICABLE');
    // 2026-10-16: 38 cm, tmax 4.5, gusts 49 gives 65; gusts of 61.6 cap 2026-10-15 at 30.
    expect(Math.max(...scores(skiing).map(Number))).toBeGreaterThanOrEqual(60);
  });

  it('U-SKI-3 Chamonix in January is APPLICABLE and 10 January scores at least 60', async () => {
    const skiing = await ranking('chamonix-january', 'SKIING');

    expect(skiing.status).toBe('APPLICABLE');
    // 77 cm depth, 12.5 cm snowfall, tmax -2, gusts 43.9 gives 88.
    expect(scoreOn(skiing, '2026-01-10')).toBeGreaterThanOrEqual(60);
  });

  it('U-SKI-3 the snowpack factor reports its value, unit and note', async () => {
    const skiing = await ranking('chamonix-january', 'SKIING');

    expect(skiing.days[0]?.factors[0]).toMatchObject({
      signal: 'snowDepth',
      value: 77,
      unit: 'cm',
      effect: 'POSITIVE',
    });
  });
});

describe('golden set: surfing', () => {
  it('U-SURF-1 London has marine nulls and is NOT_APPLICABLE with a reason', async () => {
    const surfing = await ranking('london', 'SURFING');

    expect(surfing).toMatchObject({
      status: 'NOT_APPLICABLE',
      reason: 'no marine data at this location',
    });
  });

  it('U-SURF-2 Biarritz is APPLICABLE and every day scores at least 60', async () => {
    const surfing = await ranking('biarritz', 'SURFING');

    expect(surfing.status).toBe('APPLICABLE');
    expect(scores(surfing).every((score) => score !== null && score >= 60)).toBe(true);
  });

  it('U-SURF-3 Dubai is APPLICABLE and every day scores at most 30', async () => {
    const surfing = await ranking('dubai', 'SURFING');

    expect(surfing.status).toBe('APPLICABLE');
    expect(scores(surfing).every((score) => score !== null && score <= 30)).toBe(true);
  });
});

describe('golden set: sightseeing', () => {
  async function pair(
    place: Place,
  ): Promise<{ indoor: ActivityRanking; outdoor: ActivityRanking }> {
    return {
      indoor: await ranking(place, 'INDOOR_SIGHTSEEING'),
      outdoor: await ranking(place, 'OUTDOOR_SIGHTSEEING'),
    };
  }

  it('U-RANK-6 Dubai heat puts indoor above outdoor on every day', async () => {
    const { indoor, outdoor } = await pair('dubai');

    indoor.days.forEach((day, index) => {
      expect(day.score).toBeGreaterThan(outdoor.days[index]?.score ?? 100);
    });
  });

  it('U-RANK-7 Springfield day 1 (84 mm) puts indoor above outdoor', async () => {
    const { indoor, outdoor } = await pair('springfield');

    expect(indoor.days[0]?.date).toBe('2026-10-14');
    expect(indoor.days[0]?.score).toBeGreaterThan(outdoor.days[0]?.score ?? 100);
  });

  it('U-RANK-7 Springfield outdoor scores at least 60 on three or more of days 3 to 7', async () => {
    const outdoor = await ranking('springfield', 'OUTDOOR_SIGHTSEEING');

    const good = scores(outdoor)
      .slice(2, 7)
      .filter((score) => score !== null && score >= 60);
    expect(good.length).toBeGreaterThanOrEqual(3);
  });

  it('U-RANK-8 the London rain day (2026-10-16, 82 %) puts indoor above outdoor', async () => {
    const { indoor, outdoor } = await pair('london');

    expect(scoreOn(indoor, '2026-10-16')).toBeGreaterThan(scoreOn(outdoor, '2026-10-16') ?? 100);
  });

  it('U-RANK-8 indoor never drops below its floor of 40', async () => {
    const { indoor } = await pair('chamonix');

    expect(scores(indoor).every((score) => score !== null && score >= 40)).toBe(true);
  });
});
