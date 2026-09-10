import { SaveUserRequest, UserAttributesValidator, UserAttributeValue, UserAttributeValueType, UserValidator, UserDto } from '@ailaflow/shared';
import { useMemo, useState } from 'react';
import { UserAttributeEditorRow } from '../../views/user-editor/user-editor-view';

export interface UserEditorData {
  name: string;
  password: string;
  isAdmin: boolean;
  attributes: UserAttributeEditorRow[];
  isDirty: boolean;
  isNew: boolean;
}

export interface UserEditorState extends UserEditorData {
  nameError: string | null;
  passwordError: string | null;
  attributeError: string | null;
  canSave: boolean;
  setName(name: string): void;
  setPassword(password: string): void;
  setIsAdmin(isAdmin: boolean): void;
  addAttribute(): void;
  updateAttribute(id: number, delta: Partial<UserAttributeEditorRow>): void;
  removeAttribute(id: number): void;
  getAttributes(): Record<string, UserAttributeValue>;
  setAttribute(name: string, value: UserAttributeValue): void;
  removeAttributeByName(name: string): void;
  markSaved(): void;
  toSaveRequest(): SaveUserRequest;
}

export function useUserEditorState(user?: UserDto): UserEditorState {
  const [data, setData] = useState<UserEditorData>(() => createData(user));
  const validation = useMemo(() => validateState(data), [data]);
  const { nameError, passwordError, attributeError } = validation;
  const canSave = data.isDirty && nameError === null && passwordError === null && attributeError === null;

  function update(delta: Partial<UserEditorData> | ((data: UserEditorData) => Partial<UserEditorData>)) {
    setData(data => ({
      ...data,
      ...(typeof delta === 'function' ? delta(data) : delta),
      isDirty: true
    }));
  }

  return {
    ...data,
    nameError,
    passwordError,
    attributeError,
    canSave,
    setName: name => update({ name }),
    setPassword: password => update({ password }),
    setIsAdmin: isAdmin => update({ isAdmin }),
    addAttribute: () =>
      update(data => ({
        attributes: [...data.attributes, toAttributeRow(nextAttributeId(data.attributes), '', '')]
      })),
    updateAttribute: (id, delta) =>
      update(data => ({
        attributes: data.attributes.map(attribute => (attribute.id === id ? { ...attribute, ...delta } : attribute))
      })),
    removeAttribute: id =>
      update(data => ({
        attributes: data.attributes.filter(attribute => attribute.id !== id)
      })),
    getAttributes: () => rowsToAttributes(data.attributes),
    setAttribute: (name, value) =>
      update(data => {
        const existing = data.attributes.find(attribute => attribute.name === name);
        const row = toAttributeRow(existing?.id ?? nextAttributeId(data.attributes), name, value);
        return {
          attributes: existing
            ? data.attributes.map(attribute => (attribute.id === existing.id ? row : attribute))
            : [...data.attributes, row]
        };
      }),
    removeAttributeByName: name =>
      update(data => ({
        attributes: data.attributes.filter(attribute => attribute.name !== name)
      })),
    markSaved: () =>
      setData(current => {
        if (current !== data) {
          return current;
        }
        return { ...current, password: '', isDirty: false };
      }),
    toSaveRequest: () => ({
      insert: data.isNew,
      name: data.name,
      password: data.password || undefined,
      isAdmin: data.isAdmin,
      attributes: rowsToAttributes(data.attributes)
    })
  };
}

function nextAttributeId(attributes: UserAttributeEditorRow[]): number {
  return attributes.reduce((id, attribute) => Math.max(id, attribute.id + 1), 0);
}

function createData(user?: UserDto): UserEditorData {
  return {
    name: user?.name ?? '',
    password: '',
    isAdmin: user?.isAdmin ?? false,
    attributes: Object.entries(user?.attributes ?? {}).map(([name, value], id) => toAttributeRow(id, name, value)),
    isDirty: !user,
    isNew: !user
  };
}

function toAttributeRow(id: number, name: string, value: UserAttributeValue): UserAttributeEditorRow {
  if (typeof value === 'boolean') {
    return {
      id,
      name,
      type: UserAttributeValueType.BOOLEAN,
      value: value ? 'true' : 'false'
    };
  }
  if (typeof value === 'number') {
    return {
      id,
      name,
      type: UserAttributeValueType.INTEGER,
      value: String(value)
    };
  }
  return {
    id,
    name,
    type: UserAttributeValueType.STRING,
    value
  };
}

function validateState(state: UserEditorData): { nameError: string | null; passwordError: string | null; attributeError: string | null } {
  const nameError = UserValidator.validateName(state.name);
  const passwordError = state.isNew && state.password.length === 0 ? 'Password is required to create a user.' : null;
  const names = new Set<string>();
  for (const attribute of state.attributes) {
    const attributeNameError = UserAttributesValidator.validateName(attribute.name);
    if (attributeNameError) {
      return {
        nameError,
        passwordError,
        attributeError: `Attribute name "${attribute.name}" is invalid: ${attributeNameError}`
      };
    }
    if (names.has(attribute.name)) {
      return {
        nameError,
        passwordError,
        attributeError: `Attribute name "${attribute.name}" is duplicated.`
      };
    }
    names.add(attribute.name);
    if (attribute.type === UserAttributeValueType.INTEGER && !Number.isInteger(Number(attribute.value))) {
      return {
        nameError,
        passwordError,
        attributeError: `Attribute "${attribute.name}" must be an integer.`
      };
    }
  }

  return { nameError, passwordError, attributeError: null };
}

function rowsToAttributes(rows: UserAttributeEditorRow[]): Record<string, UserAttributeValue> {
  return Object.fromEntries(
    rows.map(row => {
      switch (row.type) {
        case UserAttributeValueType.STRING:
          return [row.name, row.value];
        case UserAttributeValueType.INTEGER:
          return [row.name, Number(row.value)];
        case UserAttributeValueType.BOOLEAN:
          return [row.name, row.value === 'true'];
      }
    })
  );
}
