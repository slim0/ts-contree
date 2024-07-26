import { Effect, Data } from "effect";
import { z, ZodError } from "zod";

export class ZodParseError extends Data.TaggedError("ZodParseError")<{
  zodError: ZodError;
}> {}

export const zodParseEffect = <T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): Effect.Effect<z.infer<T>, ZodParseError> => {
  const parsedData = schema.safeParse(data);
  if (parsedData.success) {
    return Effect.succeed(parsedData);
  } else {
    return Effect.fail(new ZodParseError({ zodError: parsedData.error }));
  }
};
