import z from 'zod/v4';

export const fileContentSchema = z
  .object({
    path: z.string().min(1).describe('The path of the file content, e.g. `main.js` or `folder/main.js`.'),
    mimeType: z.string().min(1).describe('The MIME type of the content, e.g. `application/javascript`.'),
    content: z.string().describe('The actual content of the file.'),
    modifiedAt: z
      .number()
      .int()
      .nonnegative()
      .describe('The timestamp in milliseconds since the Unix epoch when the file was last modified.')
  })
  .describe('The content of a file.');

export const scriptDefinitionSchema = z
  .object({
    sandboxName: z.string().min(3).describe('The name of the sandbox environment where the script will be executed.'),
    contents: z.array(fileContentSchema).describe('An array of file contents that make up the script.'),
    hash: z.string().min(3).describe('A hash of the script contents.')
  })
  .describe('A script that can be executed in a sandbox environment.');

export type FileContent = z.infer<typeof fileContentSchema>;
export type ScriptDefinition = z.infer<typeof scriptDefinitionSchema>;
