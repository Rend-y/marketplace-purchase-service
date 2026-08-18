export interface SerializedError {
  readonly name: string;
  readonly message: string;
  readonly stack?: string;
}

export const serializeError = (error: unknown): SerializedError => {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }

  return { name: 'UnknownError', message: String(error) };
};
