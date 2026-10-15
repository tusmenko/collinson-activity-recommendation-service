import { GraphQLError, Kind } from 'graphql';
import type { ValueNode } from 'graphql';
import { describe, expect, it } from 'vitest';

import { DateScalar, DateTimeScalar } from './scalars.model';

const DATE_LITERAL: ValueNode = { kind: Kind.STRING, value: '2026-10-15' };
const INT_LITERAL: ValueNode = { kind: Kind.INT, value: '20261015' };

describe('Date and DateTime scalars', () => {
  it('U-API-4 Date passes a calendar date through serialize, parseValue and a string literal', () => {
    expect(DateScalar.serialize('2026-10-15')).toBe('2026-10-15');
    expect(DateScalar.parseValue('2026-10-15')).toBe('2026-10-15');
    expect(DateScalar.parseLiteral(DATE_LITERAL)).toBe('2026-10-15');
  });

  it('U-API-4 Date rejects a timestamp, a non-string and a non-string literal', () => {
    expect(() => DateScalar.serialize('2026-10-15T06:00:00Z')).toThrow(GraphQLError);
    expect(() => DateScalar.parseValue(20261015)).toThrow('Date expects YYYY-MM-DD, got 20261015');
    expect(() => DateScalar.parseLiteral(INT_LITERAL)).toThrow('got null');
  });

  it('U-API-4 DateTime passes an ISO 8601 timestamp through serialize, parseValue and a literal', () => {
    const stamp = '2026-10-15T06:00:00.000Z';

    expect(DateTimeScalar.serialize(stamp)).toBe(stamp);
    expect(DateTimeScalar.parseValue(stamp)).toBe(stamp);
    expect(DateTimeScalar.parseLiteral({ kind: Kind.STRING, value: stamp })).toBe(stamp);
  });

  it('U-API-4 DateTime rejects an unparseable string, a non-string and a non-string literal', () => {
    expect(() => DateTimeScalar.serialize('yesterday')).toThrow(
      'DateTime expects an ISO 8601 timestamp, got "yesterday"',
    );
    expect(() => DateTimeScalar.parseValue(0)).toThrow(GraphQLError);
    expect(() => DateTimeScalar.parseLiteral(INT_LITERAL)).toThrow('got null');
  });
});
