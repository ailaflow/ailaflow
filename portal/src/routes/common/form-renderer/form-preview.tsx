import { FormDefinition } from '@ailaflow/shared';
import { IframeForm } from './iframe-form';
import { FormAdapter } from './form-adapter';
import { useMemo } from 'react';
import { FormPreviewView } from '../../../views/form-renderer/form-preview-view';

export function FormPreview(props: { form: FormDefinition }) {
  const adapter = useMemo<FormAdapter>(
    () => ({
      allowedToReadVariableNames: null,
      outputVariableNames: [],
      assertVariableValue: () => {},
      openStartForm: async () => {},
      submitForm: async () => {},
      readVariable: async () => null,
      getTransientParams: () => null
    }),
    []
  );

  return (
    <FormPreviewView width={800} height={600} previewWidth={250}>
      <IframeForm form={props.form} adapter={adapter} isPreview={true} />
    </FormPreviewView>
  );
}
