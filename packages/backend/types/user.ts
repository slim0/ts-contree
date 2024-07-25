export type UserUUID = string & { __brand: "UserUUID" };

export type User = {
  uuid: UserUUID;
  name: string;
};

export type Users = User[];
