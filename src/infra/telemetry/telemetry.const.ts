// Service name on the telemetry resource and name of the application's meter.
export const METER_NAME = 'activity-ranking-service';

export const ANOMALY_METRIC = 'ranking_anomalies_total';

// One export a minute keeps the console exporter from crowding the JSON log stream.
export const EXPORT_INTERVAL_MS = 60_000;
