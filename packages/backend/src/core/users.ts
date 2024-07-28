import { Effect } from "effect";
import { UserNotFoundError } from "../../types/errors";
import { User, Users, UserUUID } from "../../types/user";

export function retrieveUserbyUUID(
  users: Users,
  userUuid: UserUUID
): Effect.Effect<User, UserNotFoundError> {
  const maybeUser = users.find(({ uuid }) => uuid === userUuid);
  if (!maybeUser) {
    return Effect.fail(new UserNotFoundError());
  } else {
    return Effect.succeed(maybeUser);
  }
}
