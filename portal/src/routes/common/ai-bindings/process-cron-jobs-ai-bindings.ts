import { route, routeStoreFactory, tool } from '@aibindkit/react';
import * as z from 'zod/v4';

const processCronJobsRoute = route('processCronJobs')
  .paths(['/admin/processes/:processName/cron-jobs'])
  .unavailable('You are not on a process cron jobs page.')
  .params(
    z.object({
      processName: z.string().describe('Name of the process whose cron jobs should be managed')
    })
  )
  .tools({
    getJobs: tool('Get all cron jobs for the process'),
    openCronJobEditorOverlay: tool('Open the cron job editor overlay; pass null to create a new cron job').input(
      z.object({
        cronJobId: z.string().nullable().describe('ID of the cron job to edit, or null to create a new cron job')
      })
    ),

    // overlay

    getCurrentOverlay: tool('Return the currently open overlay'),
    closeOverlay: tool('Close the currently open overlay'),

    // cronJobEditor overlay

    cronJobEditor_getDetails: tool('Get the currently edited cron job and its validation state'),
    cronJobEditor_setExpression: tool('Set the cron expression in the currently edited cron job').input(
      z.object({
        expression: z.string().describe('Five-field cron expression')
      })
    ),
    cronJobEditor_setTimeZone: tool('Set the time zone in the currently edited cron job').input(
      z.object({
        timeZone: z.string().describe('IANA time zone')
      })
    ),
    cronJobEditor_setMaxExecutionTime: tool('Set the maximum execution time in the currently edited cron job').input(
      z.object({
        maxExecutionTime: z.number().int().min(1).max(86_400).describe('Maximum execution time in seconds')
      })
    ),
    cronJobEditor_setStartValues: tool('Set the start values in the currently edited cron job').input(
      z.object({
        startValues: z.record(z.string(), z.unknown()).describe('Process start variable values')
      })
    ),
    cronJobEditor_setIsEnabled: tool('Set whether the currently edited cron job is enabled').input(
      z.object({
        isEnabled: z.boolean().describe('Whether the cron job should be enabled')
      })
    ),
    cronJobEditor_save: tool('Validate and save the currently edited cron job')
  })
  .currentPageField('overlay', 'getCurrentOverlay');

export const processCronJobsAiStoreFactory = routeStoreFactory(processCronJobsRoute);

export type ProcessCronJobsAiStore = ReturnType<typeof processCronJobsAiStoreFactory>;
