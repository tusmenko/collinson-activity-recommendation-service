import { describe, expect, it } from 'vitest';

import { locationFacts } from '../../test/setup/location-facts';
import { locationView } from './api.util';

describe('locationView', () => {
  it('U-API-3 maps the stored facts to the public Location fields', () => {
    expect(locationView(locationFacts())).toEqual({
      id: '2988507',
      name: 'Paris',
      region: 'Île-de-France',
      country: 'France',
      latitude: 48.85341,
      longitude: 2.3488,
      timezone: 'Europe/Paris',
      elevation: 42,
    });
  });

  it('U-API-3 an absent region or elevation becomes null, and internal facts stay out', () => {
    const { admin1: _admin1, elevation: _elevation, ...bare } = locationFacts();

    const view = locationView(bare);

    expect(view).toMatchObject({ region: null, elevation: null });
    expect(view).not.toHaveProperty('marineDataAvailable');
    expect(view).not.toHaveProperty('updatedAt');
  });
});
