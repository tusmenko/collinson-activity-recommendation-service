import { GraphQLError, GraphQLScalarType, Kind } from 'graphql';

const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

function calendarDate(value: unknown): string {
  if (typeof value === 'string' && CALENDAR_DATE.test(value)) {
    return value;
  }
  throw new GraphQLError(`Date expects YYYY-MM-DD, got ${JSON.stringify(value)}`);
}

function timestamp(value: unknown): string {
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) {
    return value;
  }
  throw new GraphQLError(`DateTime expects an ISO 8601 timestamp, got ${JSON.stringify(value)}`);
}

// Output-only in this schema; strings in, strings out, so no Date objects cross the boundary.
export const DateScalar = new GraphQLScalarType<string, string>({
  name: 'Date',
  description: 'A calendar date, YYYY-MM-DD, local to the location.',
  serialize: calendarDate,
  parseValue: calendarDate,
  parseLiteral: (ast) => calendarDate(ast.kind === Kind.STRING ? ast.value : null),
});

export const DateTimeScalar = new GraphQLScalarType<string, string>({
  name: 'DateTime',
  description: 'An ISO 8601 timestamp in UTC.',
  serialize: timestamp,
  parseValue: timestamp,
  parseLiteral: (ast) => timestamp(ast.kind === Kind.STRING ? ast.value : null),
});
