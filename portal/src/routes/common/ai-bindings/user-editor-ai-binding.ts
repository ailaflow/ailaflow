import * as z from 'zod/v4';
import { route, routeStoreFactory, tool } from '@aibindkit/react';

const userAttributeValue = z.union([z.string(), z.number(), z.boolean()]);

const userEditorRoute = route('userEditor')
  .paths(['/admin/users/:userName', '/admin/create-user'])
  .unavailable('You are not on a user editor page.')
  .params(
    z.object({
      userName: z.string().describe('Name of the user to edit')
    })
  )
  .tools({
    getDetails: tool("Get the user's name, admin status, attributes, and unsaved-change status"),
    setName: tool('Set the new user name before it is saved').input(
      z.object({
        name: z.string().describe('The user name')
      })
    ),
    setIsAdmin: tool('Set whether the user is an administrator').input(
      z.object({
        isAdmin: z.boolean().describe('Whether the user should be an administrator')
      })
    ),
    getAttributes: tool('Get all user attributes as name-value pairs'),
    modifyAttribute: tool('Set or remove a user attribute').input(
      z.discriminatedUnion('action', [
        z
          .object({
            action: z.literal('set').describe('Create or update a user attribute'),
            name: z.string().describe('The attribute name'),
            value: userAttributeValue.describe('The attribute value')
          })
          .strict(),
        z
          .object({
            action: z.literal('remove').describe('Remove a user attribute'),
            name: z.string().describe('The attribute name')
          })
          .strict()
      ])
    ),
    getValidationErrors: tool('Get current validation errors for the user editor'),
    hasUnsavedChanges: tool('Check whether there are unsaved user editor changes'),
    save: tool('Save all changes')
  });

export const userEditorAiStoreFactory = routeStoreFactory(userEditorRoute);

export type UserEditorAiStore = ReturnType<typeof userEditorAiStoreFactory>;
