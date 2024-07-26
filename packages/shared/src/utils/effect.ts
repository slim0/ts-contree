import { Effect } from "effect";
import { z, ZodError } from "zod";

export type ZodParseError = {
  message: "Unable to parse";
  zodError: ZodError;
};

export const parseEffect = <T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): Effect.Effect<z.infer<T>, ZodParseError> => {
  const parsedData = schema.safeParse(data);
  if (parsedData.success) {
    return Effect.succeed(parsedData);
  } else {
    return Effect.fail({
      message: "Unable to parse",
      zodError: parsedData.error,
    });
  }
};
