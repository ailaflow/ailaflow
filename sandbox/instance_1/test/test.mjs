import { readInput, writeOutput } from '@aila/bridge-lib';

async function main() {
  const input = readInput();

  const currency = String(input.currency).toUpperCase();
  const response = await fetch('https://api.nbp.pl/api/exchangerates/tables/A/?format=json');
  if (!response.ok) {
    throw new Error(`NBP request failed with status ${response.status}`);
  }
  const tables = await response.json();
  const rates = tables?.[0]?.rates;
  if (!Array.isArray(rates)) {
    throw new Error('NBP response has invalid format');
  }
  const rate = rates.find(r => r?.code === currency);
  if (!rate) {
    throw new Error(`Currency ${currency} not found in table A`);
  }

  writeOutput({
    currency,
    value: rate.mid
  });
}

main();
