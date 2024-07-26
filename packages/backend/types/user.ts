export type UserUUID = string & { __brand: "UserUUID" };

export type User = {
  uuid: UserUUID;
};

export type Users = User[];
