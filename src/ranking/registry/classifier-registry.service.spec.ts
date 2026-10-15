import { describe, expect, it } from 'vitest';

import { SkiingClassifier } from '../classifiers/skiing/skiing.classifier';
import { SurfingClassifier } from '../classifiers/surfing/surfing.classifier';
import { ScoreEngine } from '../engine/score-engine.service';
import { ClassifierRegistry } from './classifier-registry.service';
import type { Classifier } from './classifier.port';

describe('ClassifierRegistry', () => {
  it('U-RANK-2 lists registered ids in registration order and returns each classifier', () => {
    const registry = new ClassifierRegistry();
    const skiing = new SkiingClassifier(new ScoreEngine());
    const surfing = new SurfingClassifier(new ScoreEngine());

    registry.register(skiing);
    registry.register(surfing);

    expect(registry.ids()).toEqual(['SKIING', 'SURFING']);
    expect(registry.all()).toEqual([skiing, surfing]);
    expect(registry.get('SURFING')).toBe(surfing);
    expect(registry.get('CYCLING')).toBeUndefined();
  });

  it('U-RANK-2 classifiers given at construction are registered in order, before any other call', () => {
    const skiing = new SkiingClassifier(new ScoreEngine());
    const surfing = new SurfingClassifier(new ScoreEngine());

    const registry = new ClassifierRegistry([skiing, surfing]);

    expect(registry.ids()).toEqual(['SKIING', 'SURFING']);
    expect(registry.get('SKIING')).toBe(skiing);
  });

  it('U-RULES-1 the rule files come from the registered classifiers, keyed by id in registration order', () => {
    const skiing = new SkiingClassifier(new ScoreEngine());
    const surfing = new SurfingClassifier(new ScoreEngine());

    const files = new ClassifierRegistry([surfing, skiing]).ruleFiles();

    expect(Object.keys(files)).toEqual(['SURFING', 'SKIING']);
    expect(files).toEqual({ SURFING: surfing.ruleFile, SKIING: skiing.ruleFile });
  });

  it('U-RANK-2 a duplicate id is rejected', () => {
    const registry = new ClassifierRegistry();
    const skiing: Classifier = new SkiingClassifier(new ScoreEngine());
    registry.register(skiing);

    expect(() => {
      registry.register(skiing);
    }).toThrow(/SKIING/);
  });
});
