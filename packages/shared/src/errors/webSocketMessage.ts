export type ServerMessageError<T> = {
  _tag: T;
  message: string;
};

export type UnparsableMessageError = "UnparsableMessageError";
