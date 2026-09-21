---
title: Send message
description: Send a message to another AilaFlow user using notifications.
authors:
  - author: b4rtaz
    authorUrl: https://github.com/b4rtaz
---

# Create `/send_message`

Create a new process named `/send_message`.

Set the process description to:

```text
Send a message to another AilaFlow user using notifications. This process allows only to send a message.
```

## Variables

Create two **input variables**:

- `$recipient` — `string`
  - description: `Username of the AilaFlow user who should receive the message. Accepts values such as anna or @anna.`

- `$message` — `string`
  - description: `Message text that should be sent to the recipient.`

Descriptions for both input variables are required.

Create two additional variables:

- `$notification_text` — `string`
- `$result` — `string`

On successful execution, `$result` should contain:

```text
the message is sent
```

## Validate the recipient

Add a **Script** step at the beginning of the process.

The script should read `$recipient` and `$message`.

Normalize `$recipient` by trimming whitespace and accepting usernames in either format:

```text
anna
@anna
```

Normalize the recipient to the canonical form with the `@` prefix:

```text
anna → @anna
@anna → @anna
```

Reject malformed usernames, including:

- empty values;
- multiple `@` prefixes;
- usernames containing whitespace.

Use:

```js
await ailaflow.userExists(...)
```

to verify that the recipient exists.

If the user does not exist, fail the Script step with a clear error. The process must not continue to the Notification step.

## Prepare the notification

In the same Script step, resolve the user who started the process using:

```js
await ailaflow.getStartedBy();
```

Set `$notification_text` using this format:

```text
Message from @caller: {message}
```

For example:

```text
Message from @robert: Can you review the document?
```

where:

- `@caller` is the user who started the process;
- `{message}` is the value of `$message`.

## Notification step

Add a **Notification** step after the Script step.

Configure it to:

- send the notification to the normalized `$recipient`;
- use `$notification_text` as the notification text.

After the notification has been successfully sent, set:

```text
$result = "the message is sent"
```

## Start form

Add a start form that collects:

- `$recipient`;
- `$message`.

Keep it minimal:

- one text input for the recipient;
- one textarea or text input for the message;
- one button to start the process;
- validation that both values are provided;
- basic recipient format validation;
- simple error presentation if submission fails.

Use recipient placeholder text such as:

```text
@anna or anna
```

Submit the values as the process input variables:

```js
await ailaflow.submitForm({
  recipient,
  message
});
```

Use minimal HTML and CSS. The form should be responsive and work well on mobile and desktop.

## Return step

At the end, add a **Return** step and return `$result`.

A successful process execution should return:

```json
{
  "result": "The message is sent"
}
```

Attach a form directly to the Return step.

The form should display a simple success state, for example:

```text
Message sent

The message was sent successfully.
```

Keep the Start and Return forms visually consistent:

- same typography;
- same container width;
- same spacing;
- same general visual style;
- responsive on mobile and desktop.

## Process flow

The complete process flow should be:

```text
Start + form
→ Script: validate recipient and prepare notification
→ Notification
→ Return + success form
```

The notification must only be sent after the recipient format has been validated and the target AilaFlow user has been confirmed to exist.
