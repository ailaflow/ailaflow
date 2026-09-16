import assert from 'node:assert/strict';
import test from 'node:test';
import { SlackError, SlackErrorReason } from '../../slack/slack-error';
import { EndpointError } from '../framework/endpoint-error';
import { mapSlackEndpointErrors } from './slack-endpoint-error-mapper';

test('maps Slack domain errors to HTTP endpoint errors', async () => {
  await assert.rejects(
    () => mapSlackEndpointErrors(() => Promise.reject(new SlackError(SlackErrorReason.INVALID_MAPPING, 'invalid mapping'))),
    error => error instanceof EndpointError && error.status === 400 && error.message === 'invalid mapping'
  );
  await assert.rejects(
    () => mapSlackEndpointErrors(() => Promise.reject(new SlackError(SlackErrorReason.MAPPING_REVISION_CONFLICT, 'mapping conflict'))),
    error => error instanceof EndpointError && error.status === 409 && error.message === 'mapping conflict'
  );
  await assert.rejects(
    () => mapSlackEndpointErrors(() => Promise.reject(new SlackError(SlackErrorReason.API_UNAVAILABLE, 'Slack unavailable'))),
    error => error instanceof EndpointError && error.status === 503 && error.message === 'Slack unavailable'
  );
});

test('preserves errors outside the Slack domain', async () => {
  const error = new Error('unexpected');
  await assert.rejects(
    () => mapSlackEndpointErrors(() => Promise.reject(error)),
    candidate => candidate === error
  );
});
