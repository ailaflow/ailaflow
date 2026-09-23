import assert from 'node:assert/strict';
import test from 'node:test';
import { TelegramConfigurationError, TelegramConfigurationErrorReason } from '../../telegram/telegram-configuration-error';
import { EndpointError } from '../framework/endpoint-error';
import { mapTelegramEndpointErrors } from './telegram-endpoint-error-mapper';

test('maps invalid Telegram configurations to bad requests', async () => {
  await assert.rejects(
    () =>
      mapTelegramEndpointErrors(() =>
        Promise.reject(new TelegramConfigurationError(TelegramConfigurationErrorReason.INVALID_CONFIGURATION, 'Invalid configuration'))
      ),
    error => error instanceof EndpointError && error.status === 400 && error.message === 'Invalid configuration'
  );
});

test('maps missing Telegram configurations to not found responses', async () => {
  await assert.rejects(
    () =>
      mapTelegramEndpointErrors(() =>
        Promise.reject(new TelegramConfigurationError(TelegramConfigurationErrorReason.CONFIGURATION_NOT_FOUND, 'Configuration not found'))
      ),
    error => error instanceof EndpointError && error.status === 404 && error.message === 'Configuration not found'
  );
});

test('does not map unexpected errors', async () => {
  const error = new Error('Unexpected error');
  await assert.rejects(
    () => mapTelegramEndpointErrors(() => Promise.reject(error)),
    candidate => candidate === error
  );
});
