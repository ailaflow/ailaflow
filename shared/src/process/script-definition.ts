import * as z from 'zod/v4';

export const fileContentSchema = z
  .object({
    path: z.string().min(1).describe('The path of the file content, e.g. `main.js` or `folder/main.js`.'),
    mimeType: z.string().min(1).describe('The MIME type of the content, e.g. `application/javascript`.'),
    content: z.string().describe('The actual content of the file.')
  })
  .describe('The content of a file.');

export const scriptDefinitionSchema = z
  .object({
    sandboxName: z.string().min(3).describe('The name of the sandbox environment where the script will be executed.'),
    allowedProcessNames: z.array(z.string()).describe('An array of process names that are allowed to be executed by the script.'),
    contents: z.array(fileContentSchema).describe('An array of file contents that make up the script.')
  })
  .describe('A script that can be executed in a sandbox environment.');

export type FileContent = z.infer<typeof fileContentSchema>;
export type ScriptDefinition = z.infer<typeof scriptDefinitionSchema>;
