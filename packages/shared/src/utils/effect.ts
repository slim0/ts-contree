import { Effect, Data } from "effect";
import { z, ZodError } from "zod";

export class ZodParseError extends Data.TaggedError("ZodParseError")<{
  zodError: ZodError;
}> {}

type NotFunction<T> = T extends Function ? never : T;

export const zodParseEffect = <T extends z.ZodTypeAny, U>(
  zodSchema: T,
  data: NotFunction<U>
): Effect.Effect<z.infer<T>, ZodParseError> => {
  const parsedData = zodSchema.safeParse(data);
  if (parsedData.success) {
    return Effect.succeed(parsedData);
  } else {
    return Effect.fail(new ZodParseError({ zodError: parsedData.error }));
  }
};
