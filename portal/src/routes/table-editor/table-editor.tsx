import { TableDto } from '@aila/model';
import { useNavigate } from 'react-router-dom';
import { useApiClient } from '../../auth/auth-context';
import { ResourceEditorView } from '../../views/resource-editor/resource-editor-view';
import { ResourceSimpleDetailsView } from '../../views/resource-editor/resource-simple-details-view';
import { useUnsavedChangesController } from '../common/admin-portal';
import { useTableEditorAi } from './table-editor-ai';
import { useTableEditorState } from './table-editor-state';
import { TableDataGrid } from './table-data-grid';

export function TableEditor(props: { table?: TableDto }) {
  const apiClient = useApiClient();
  const navigate = useNavigate();
  const state = useTableEditorState(props.table);

  async function save(): Promise<void> {
    const response = await apiClient.table.saveTable(AbortSignal.timeout(5_000), state.toSaveRequest());
    if (state.isNew) {
      navigate(`/admin/tables/${encodeURIComponent(response.name)}`);
    } else {
      state.markSaved();
    }
  }

  useTableEditorAi(state, save);
  useUnsavedChangesController(state.isDirty);

  const detailsId = 'admin-table-editor-details';

  return (
    <ResourceEditorView
      icon="#"
      name={state.name}
      isNameReadOnly={!state.isNew}
      isNameValid={state.nameError === null}
      canSave={state.canSave}
      onSave={save}
      onNameChange={state.setName}
      detailsId={detailsId}
      details={
        <ResourceSimpleDetailsView
          id={detailsId}
          description={state.description}
          descriptionError={state.descriptionError}
          onDescriptionChange={state.setDescription}
        />
      }
      areDetailsVisible={true}
      canSwitch={false}
    >
      {!state.isNew && <TableDataGrid tableName={state.name} />}
    </ResourceEditorView>
  );
}
