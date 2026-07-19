export enum UserAttributeValueType {
  STRING = 1,
  INTEGER = 2,
  BOOLEAN = 3
}

export type UserAttributeValue = string | number | boolean;
export type UserAttributes = Record<string, UserAttributeValue>;

export const USER_NAME_ATTRIBUTE_NAME = '$user_name';
export const ALL_ATTRIBUTE_NAME = '$all';
