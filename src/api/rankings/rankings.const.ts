// The `activities` argument of Query.activityRankings and Location.rankings, validated by ActivitiesSchema.
export const ACTIVITIES_ARG_DESCRIPTION =
  'Activities to rank; omit the argument for all of them. An empty list is rejected with BAD_USER_INPUT.';

// The `region` argument of Query.activityRankings, validated by RegionSchema.
export const REGION_ARG_DESCRIPTION =
  'A state, province or other first-level area that narrows an ambiguous city, matched exactly by the geocoder (for example "Illinois" for Springfield).';
