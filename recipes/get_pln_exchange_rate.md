---
title: Get PLN exchange rate
description: Fetch the current exchange rate for a currency against PLN using the NBP API.
authors:
  - author: b4rtaz
    authorUrl: https://github.com/b4rtaz
---

# Create `/get_pln_exchange_rate`

Create a new process named `/get_pln_exchange_rate`.

The process should have one start variable:

- `$currency` — `string`, for example `USD`, `EUR`, or `GBP`.

Normalize the value by trimming whitespace and converting it to uppercase.

Create a `$result` variable with two optional root fields.

When the currency is found:

```json
{
  "found": {
    "code": "USD",
    "mid": 3.7667
  }
}
```

When it is not found:

```json
{
  "notFound": true
}
```

## NBP API

Use the NBP API:

```http
GET https://api.nbp.pl/api/exchangerates/tables/{table}/?format=json
```

Use only tables `A` and `B`, as both provide exchange rates using the `mid` field.

Example of a truncated response from table `A`:

```json
[
  {
    "table": "A",
    "no": "179/A/NBP/2026",
    "effectiveDate": "2026-09-15",
    "rates": [
      {
        "currency": "dolar amerykański",
        "code": "USD",
        "mid": 3.7667
      },
      {
        "currency": "euro",
        "code": "EUR",
        "mid": 4.3445
      }
    ]
  }
]
```

Search the `rates` array and match the requested currency against the `code` field.

The lookup should work as follows:

1. Fetch table `A` and search for `$currency`.
2. If found, set `$result.found` with the `code` and `mid` value.
3. Otherwise, fetch table `B` and search again.
4. If the currency is not found in either table, set:

```json
{
  "notFound": true
}
```

Use a Script step with the built-in Node.js `fetch`. Read `$currency` and write the result to `$result`.

If an NBP request fails or returns an invalid response, fail the script with a meaningful error instead of returning `notFound`.

## Start form

Add a start form that collects `$currency` before the process begins.

Keep it minimal:

- one text input for the currency code;
- one button to start the process;
- a short label or heading;
- validation that the value is not empty.

Use minimal HTML and CSS. The form should be responsive and work well on mobile and desktop.

## Finish step

At the end, use a **Finish** step and return `$result`.

Add a form directly to the Finish step that displays the result.

Set an example value for `$result` in the form definition so the form can be previewed with realistic data:

```json
{
  "found": {
    "code": "USD",
    "mid": 3.7667
  }
}
```

Keep the HTML and CSS minimal and simple.

When the currency is found, show the currency code and exchange rate clearly, for example:

```text
USD
1 USD = 3.7667 PLN
```

When it is not found, display:

```text
Currency not found
```

The Start and Finish forms should use the same simple visual style, with consistent typography, spacing, input/button styling, and responsive behavior across mobile and desktop screens.
