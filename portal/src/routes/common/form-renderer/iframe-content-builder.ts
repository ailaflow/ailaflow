import { FormDefinition } from '@ailaflow/shared';

const frameworkCss = `
html,
body {
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
    openStartForm: () => {
      return request('openStartForm', {});
    },
    submitForm: (values) => {
      return request('submitForm', values);
    },
    tryReadUserStorage: (key) => {
      return request('tryReadUserStorage', { key });
    },
    writeUserStorage: (key, value) => {
      return request('writeUserStorage', { key, value });
    },
    readVariable: (name) => {
      name = normalizeResourceName(name, '$');
      return request('readVariable', { name });
    }
  };

  function collectFormError(e) {
    const error = e instanceof Error ? e : new Error(String(e));
    request('collectFormError', { message: error.message, stack: error.stack });
  }

  window.addEventListener('error', (event) => {
    collectFormError(event.error ?? event.message);
  });
  window.addEventListener('unhandledrejection', (event) => {
    collectFormError(event.reason);
  });
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
