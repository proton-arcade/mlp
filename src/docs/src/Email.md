---
title: Email
description: Read the user's built-in Mixt OS mailbox with Mixt.js.
platforms: [websites, apps, nodejs, workers]
---

The Email API lets your app read the user's built-in Mixt OS mailbox. Messages are stored in the user's own cloud drive, so your app can list the inbox and read messages, attachments included, once the user grants access to their mailbox. Mail reaches the mailbox from inside Mixt OS only; this API does not send email.

With the [User-Pays Model](/user-pays-model/), the account making the call covers its own usage: mail lives in the user's storage.

## Features

<div style="overflow:hidden; margin-bottom: 30px;">
    <div class="example-group active" data-section="list"><span>List Messages</span></div>
    <div class="example-group" data-section="get"><span>Read a Message</span></div>
</div>

<div class="example-content" data-section="list" style="display:block;">

#### List the ten newest messages in the inbox

```html
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
        (async () => {
            const page = await mixt.email.list({ limit: 10 });
            for (const message of page.items) {
                mixt.print(`${message.date}  ${message.subject}<br>`);
            }
        })();
    </script>
</body>
</html>
```

</div>

<div class="example-content" data-section="get">

#### Read the newest message

```html
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
        (async () => {
            const { items } = await mixt.email.list({ limit: 1 });
            if (items.length === 0) return mixt.print('Inbox is empty');

            const message = await mixt.email.get(items[0].id);
            mixt.print(`From: ${message.from?.address}<br>`);
            mixt.print(`Subject: ${message.subject}<br>`);
            mixt.print(`<pre>${message.text}</pre>`);
        })();
    </script>
</body>
</html>
```

</div>

## Functions

- **[`mixt.email.list()`](/Email/list/)** - List the messages in the user's mailbox, newest first
- **[`mixt.email.get()`](/Email/get/)** - Fetch and parse one message, attachments included
