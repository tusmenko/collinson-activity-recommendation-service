// ranking_anomalies_total{type} (design D-7); phase 5 backs it with an OpenTelemetry counter.
export abstract class AnomalyCounter {
  abstract increment(type: string): void;
}
