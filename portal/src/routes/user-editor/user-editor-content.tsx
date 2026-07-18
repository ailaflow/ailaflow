import { UserAttributeValue, UserAttributeValueType, UserDto, UserValidator } from '@aila/model';
import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApiClient } from '../../auth/auth-context';
import { ResourceEditorView } from '../../views/resource-editor/resource-editor-view';
import { UserAttributeEditorRow, UserEditorView } from '../../views/user-editor/user-editor-view';

interface EditorState {
  name: string;
  password: string;
  isAdmin: boolean;
  attributes: UserAttributeEditorRow[];
  isDirty: boolean;
}

export function UserEditorContent(props: { user: UserDto }) {
  const apiClient = useApiClient();
  const navigate = useNavigate();
  const lastAttributeId = useRef(0);
  const [state, setState] = useState<EditorState>(() => ({
    name: props.user.name,
    password: '',
    isAdmin: props.user.isAdmin,
    attributes: Object.entries(props.user.attributes).map(([name, value]) => toAttributeRow(lastAttributeId.current++, name, value)),
    isDirty: false
  }));

  const validation = useMemo(() => validateState(state), [state]);
  const canSave = state.isDirty && validation.nameError === null && validation.attributeError === null;

  async function save() {
    const abortSignal = AbortSignal.timeout(5_000);
    const response = await apiClient.user.updateUser(abortSignal, {
      id: props.user.id,
      name: state.name,
      password: state.password || undefined,
      isAdmin: state.isAdmin,
      attributes: rowsToAttributes(state.attributes)
    });
    setState(state => ({ ...state, password: '', isDirty: false }));
    navigate(`/admin/users/${response.id}`);
  }

  function update(delta: Partial<EditorState>) {
    setState(state => ({ ...state, ...delta, isDirty: true }));
  }

  function updateAttribute(id: number, delta: Partial<UserAttributeEditorRow>) {
    update({
      attributes: state.attributes.map(attribute => (attribute.id === id ? { ...attribute, ...delta } : attribute))
    });
  }

  function addAttribute() {
    update({
      attributes: [
        ...state.attributes,
        {
          id: lastAttributeId.current++,
          name: '',
          type: UserAttributeValueType.STRING,
          value: ''
        }
      ]
    });
  }

  function removeAttribute(id: number) {
    update({
      attributes: state.attributes.filter(attribute => attribute.id !== id)
    });
  }

  return (
    <ResourceEditorView
      icon="@"
      name={state.name}
      isNameReadOnly={false}
      isNameValid={validation.nameError === null}
      canSave={canSave}
      onSave={save}
      onNameChange={name => update({ name })}
      canSwitch={false}
      switchLabel=""
    >
      <UserEditorView
        isAdmin={state.isAdmin}
        password={state.password}
        attributes={state.attributes}
        attributeError={validation.attributeError}
        onIsAdminChange={isAdmin => update({ isAdmin })}
        onPasswordChange={password => update({ password })}
        onAttributeAdd={addAttribute}
        onAttributeRemove={removeAttribute}
        onAttributeChange={updateAttribute}
      />
    </ResourceEditorView>
  );
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

function validateState(state: EditorState): { nameError: string | null; attributeError: string | null } {
  const nameError = UserValidator.validateName(state.name);
  if (nameError) {
    return { nameError, attributeError: null };
  }

  const names = new Set<string>();
  for (const attribute of state.attributes) {
    const attributeNameError = UserValidator.validateAttributeName(attribute.name);
    if (attributeNameError) {
      return {
        nameError: null,
        attributeError: `Attribute name "${attribute.name}" is invalid: ${attributeNameError}`
      };
    }
    if (names.has(attribute.name)) {
      return {
        nameError: null,
        attributeError: `Attribute name "${attribute.name}" is duplicated.`
      };
    }
    names.add(attribute.name);
    if (attribute.type === UserAttributeValueType.INTEGER && !Number.isInteger(Number(attribute.value))) {
      return {
        nameError: null,
        attributeError: `Attribute "${attribute.name}" must be an integer.`
      };
    }
  }

  return { nameError: null, attributeError: null };
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
