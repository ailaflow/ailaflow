import { FormDefinition } from '@ailaflow/shared';

const frameworkCss = `
html,
body {
  margin: 0;
  padding: 0;
  width: 100%;
  min-height: 100%;
}
`;

const frameworkScript = `
(function () {
  let lastId = 0;

  function request(type, payload) {
    return new Promise((resolve, reject) => {
      const id = ++lastId;

      window.parent.postMessage({
        type,
        id,
        payload,
      }, '*');

      function onMessage(event) {
        if (event.data?.type === type && event.data?.id === id) {
          window.removeEventListener('message', onMessage);
          clearTimeout(to);
          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve(event.data.payload);
          }
        }
      }

      window.addEventListener('message', onMessage);

      const to = setTimeout(() => {
        window.removeEventListener('message', onMessage);
        reject(new Error('Request timed out'));
      }, 5_000);
    });
  }

  function normalizeResourceName(name, prefix) {
    if (name.startsWith(prefix)) {
      return name.substring(1);
    }
    return name;
  }

  window.ailaflow = {
    submitForm: (data) => {
      return request('submitForm', data);
    },
    readVariable: (name) => {
      name = normalizeResourceName(name, '$');
      return request('readVariable', { name });
    },
    startCurrentProcess: (input) => {
      return request('startCurrentProcess', { name: null, input });
    },
    startProcess: (processName, input) => {
      const name = normalizeResourceName(name, '/');
      return request('startProcess', { name, input });
    }
  };
}());
`;

export class IframeContentBuilder {
  public static build(form: FormDefinition): string {
    return `
<!doctype html>
<html>
  <head>
    <title>AilaFlow Form</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script>${frameworkScript}<\/script>
    <style>
      ${frameworkCss}
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
}
