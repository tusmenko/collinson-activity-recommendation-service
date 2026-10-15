// A domain error as the client sees it.
export interface MappedError {
  readonly message: string;
  readonly extensions: Readonly<Record<string, unknown>>;
}
