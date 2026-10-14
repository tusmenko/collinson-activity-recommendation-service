// The current time as a dependency, so tests can fix it instead of faking global timers.
export abstract class ClockPort {
  abstract now(): Date;
}
