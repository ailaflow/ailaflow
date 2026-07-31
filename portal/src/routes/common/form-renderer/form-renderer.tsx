import { IframeForm } from './iframe-form';
import { JsonForm } from './json-form';
import { FormAdapter } from './form-adapter';
import { FormDefinition } from '@aila/model';

export interface FormRendererProps {
  form: FormDefinition | null | undefined;
  adapter: FormAdapter;
}

export function FormRenderer(props: FormRendererProps) {
  return props.form ? <IframeForm form={props.form} adapter={props.adapter} /> : <JsonForm adapter={props.adapter} />;
}
