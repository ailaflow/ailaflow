import { FormDefinition } from '@aila/model';
import { useMemo } from 'react';

export interface FormRendererProps {
  form: FormDefinition;
}

function createIframeContent(form: FormDefinition): string {
  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html,
      body {
        margin: 0;
        padding: 0;
        width: 100%;
        min-height: 100%;
      }
      * {
        box-sizing: border-box;
      }
      ${form.css}
    </style>
  </head>

  <body>
    ${form.html}
    <script>${form.js}<\/script>
  </body>
</html>
`;
}

export function FormRenderer(props: FormRendererProps) {
  const content = useMemo(() => {
    return createIframeContent(props.form);
  }, [props.form]);

  return (
    <div className="w-full h-full">
      <iframe title="Form renderer" sandbox="allow-scripts" srcDoc={content} className="h-full w-full border-0" />
    </div>
  );
}
