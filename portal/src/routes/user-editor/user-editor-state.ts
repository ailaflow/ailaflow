import {
  SaveUserRequest,
  UserAttributesValidator,
  UserAttributeValue,
  UserAttributeValueType,
  UserValidator,
  UserDto
} from '@ailaflow/shared';
import { useMemo, useState } from 'react';
import { UserAttributeEditorRow } from '../../views/user-editor/user-editor-view';

export interface UserEditorData {
  name: string;
  email: string;
  password: string;
  isActive: boolean;
  isAdmin: boolean;
  attributes: UserAttributeEditorRow[];
  isDirty: boolean;
  isNew: boolean;
}

export interface UserEditorState extends UserEditorData {
  nameError: string | null;
  emailError: string | null;
  passwordError: string | null;
  attributeError: string | null;
  canSave: boolean;
  setName(name: string): void;
  setEmail(email: string): void;
  setPassword(password: string): void;
  setIsActive(isActive: boolean): void;
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
  const { nameError, emailError, passwordError, attributeError } = validation;
  const canSave = data.isDirty && nameError === null && emailError === null && passwordError === null && attributeError === null;

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
    emailError,
    passwordError,
    attributeError,
    canSave,
    setName: name => update({ name }),
    setEmail: email => update({ email }),
    setPassword: password => update({ password }),
    setIsActive: isActive => update({ isActive }),
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
      email: data.email || null,
      password: data.password || undefined,
      isActive: data.isActive,
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
    email: user?.email ?? '',
    password: '',
    isActive: user?.isActive ?? true,
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

function validateState(state: UserEditorData): {
  nameError: string | null;
  emailError: string | null;
  passwordError: string | null;
  attributeError: string | null;
} {
  const nameError = UserValidator.validateName(state.name);
  const emailError = UserValidator.validateEmail(state.email || null);
  const passwordError = state.isNew || state.password.length > 0 ? UserValidator.validatePassword(state.password) : null;
  const names = new Set<string>();
  for (const attribute of state.attributes) {
    const attributeNameError = UserAttributesValidator.validateName(attribute.name);
    if (attributeNameError) {
      return {
        nameError,
        emailError,
        passwordError,
        attributeError: `Attribute name "${attribute.name}" is invalid: ${attributeNameError}`
      };
    }
    if (names.has(attribute.name)) {
      return {
        nameError,
        emailError,
        passwordError,
        attributeError: `Attribute name "${attribute.name}" is duplicated.`
      };
    }
    names.add(attribute.name);
    if (attribute.type === UserAttributeValueType.INTEGER && !Number.isInteger(Number(attribute.value))) {
      return {
        nameError,
        emailError,
        passwordError,
        attributeError: `Attribute "${attribute.name}" must be an integer.`
      };
    }
  }

  return { nameError, emailError, passwordError, attributeError: null };
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
