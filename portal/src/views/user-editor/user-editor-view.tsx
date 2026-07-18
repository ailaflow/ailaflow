import { UserAttributeValueType } from '@aila/model';

export interface UserAttributeEditorRow {
  id: number;
  name: string;
  type: UserAttributeValueType;
  value: string;
}

export interface UserEditorViewProps {
  isAdmin: boolean;
  password: string;
  attributes: UserAttributeEditorRow[];
  attributeError: string | null;
  onIsAdminChange(isAdmin: boolean): void;
  onPasswordChange(password: string): void;
  onAttributeAdd(): void;
  onAttributeRemove(id: number): void;
  onAttributeChange(id: number, delta: Partial<UserAttributeEditorRow>): void;
}

export function UserEditorView(props: UserEditorViewProps) {
  return (
    <div className="h-full min-h-0 overflow-auto p-5">
      <div className="space-y-6">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Access</h2>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={props.isAdmin}
              onChange={e => props.onIsAdminChange(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Admin
          </label>
          <label className="block max-w-sm">
            <span className="mb-1 block text-sm font-medium text-slate-700">New password</span>
            <input
              type="password"
              value={props.password}
              onChange={e => props.onPasswordChange(e.target.value)}
              className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm outline-none focus:border-slate-500"
            />
          </label>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">Attributes</h2>
            <button
              type="button"
              onClick={props.onAttributeAdd}
              className="inline-flex h-8 items-center rounded-md border border-slate-900 bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800"
            >
              Add
            </button>
          </div>

          {props.attributeError ? <div className="text-sm text-red-700">{props.attributeError}</div> : null}

          <div className="overflow-hidden rounded-md border border-slate-200">
            <table className="min-w-full table-fixed divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="w-[30%] px-3 py-2.5 font-semibold">Name</th>
                  <th className="w-[22%] px-3 py-2.5 font-semibold">Type</th>
                  <th className="px-3 py-2.5 font-semibold">Value</th>
                  <th className="w-24 px-3 py-2.5 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {props.attributes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                      No attributes found.
                    </td>
                  </tr>
                ) : (
                  props.attributes.map(attribute => (
                    <tr key={attribute.id}>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={attribute.name}
                          onChange={e => props.onAttributeChange(attribute.id, { name: e.target.value })}
                          className="h-8 w-full rounded-md border border-slate-300 px-2 outline-none focus:border-slate-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={attribute.type}
                          onChange={e =>
                            props.onAttributeChange(attribute.id, {
                              type: Number(e.target.value) as UserAttributeValueType,
                              value: e.target.value === String(UserAttributeValueType.BOOLEAN) ? 'false' : ''
                            })
                          }
                          className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 outline-none focus:border-slate-500"
                        >
                          <option value={UserAttributeValueType.STRING}>String</option>
                          <option value={UserAttributeValueType.INTEGER}>Integer</option>
                          <option value={UserAttributeValueType.BOOLEAN}>Boolean</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">{renderAttributeValueInput(attribute, props.onAttributeChange)}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => props.onAttributeRemove(attribute.id)}
                          className="inline-flex h-8 items-center rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function renderAttributeValueInput(
  attribute: UserAttributeEditorRow,
  onAttributeChange: (id: number, delta: Partial<UserAttributeEditorRow>) => void
) {
  if (attribute.type === UserAttributeValueType.BOOLEAN) {
    return (
      <label className="inline-flex h-8 items-center gap-2 text-slate-700">
        <input
          type="checkbox"
          checked={attribute.value === 'true'}
          onChange={e => onAttributeChange(attribute.id, { value: e.target.checked ? 'true' : 'false' })}
          className="h-4 w-4 rounded border-slate-300"
        />
        Enabled
      </label>
    );
  }

  return (
    <input
      type={attribute.type === UserAttributeValueType.INTEGER ? 'number' : 'text'}
      value={attribute.value}
      onChange={e => onAttributeChange(attribute.id, { value: e.target.value })}
      className="h-8 w-full rounded-md border border-slate-300 px-2 outline-none focus:border-slate-500"
    />
  );
}
