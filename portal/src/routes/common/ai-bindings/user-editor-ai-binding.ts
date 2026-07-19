import z from 'zod/v4';
import { route, routeStoreFactory, tool } from '@aibindkit/react';

const userAttributeValue = z.union([z.string(), z.number(), z.boolean()]);

const userEditorRoute = route('userEditor')
  .paths(['/admin/users/:userName'])
  .unavailable('You are not on a user editor page.')
  .params(
    z.object({
      userName: z.string().describe('Name of the user to edit')
    })
  )
  .tools({
    getDetails: tool("Get the user's name, admin status, attributes, and unsaved-change status"),
    setIsAdmin: tool('Set whether the user is an administrator').input(
      z.object({
        isAdmin: z.boolean().describe('Whether the user should be an administrator')
      })
    ),
    getAttributes: tool('Get all user attributes as name-value pairs'),
    setAttribute: tool('Create or update a user attribute').input(
      z.object({
        name: z.string().describe('The attribute name'),
        value: userAttributeValue.describe('The attribute value')
      })
    ),
    removeAttribute: tool('Remove a user attribute').input(
      z.object({
        name: z.string().describe('The attribute name')
      })
    ),
    getValidationErrors: tool('Get current validation errors for the user editor'),
    hasUnsavedChanges: tool('Check whether there are unsaved user editor changes'),
    save: tool('Save all changes')
  });

export const userEditorAiStoreFactory = routeStoreFactory(userEditorRoute);

export type UserEditorAiStore = ReturnType<typeof userEditorAiStoreFactory>;
