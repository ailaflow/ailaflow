import { FormDefinition } from '@aila/model';

const frameworkCss = `
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
`;

const frameworkScript = `
(function () {
  let lastId = 1024;

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

  window.aila = {
    submitForm: (data) => request('submitForm', data),
  };
}());
`;

export class IframeContentBuilder {
  public static build(form: FormDefinition): string {
    return `
<!doctype html>
<html>
  <head>
    <title>Aila Form</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      ${frameworkCss}
      ${form.css}
    </style>
  </head>

  <body>
    ${form.html}
    <script>${frameworkScript}<\/script>
    <script>${form.js}<\/script>
  </body>
</html>
`;
  }
}
