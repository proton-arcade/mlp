---
title: mixt.ui.showFeedbackDialog()
description: Opens a dialog the user can use to send feedback to your app.
platforms: [ websites, apps]
---

Opens a dialog the user can use to send feedback about your app. Feedback is not delivered to developers in this deployment: external email is removed, so the dialog reports that feedback is unavailable. The feedback never passes through your app's code.

Inside Mixt OS, the dialog is rendered by the desktop environment. On a website, a mixt.mpl popup hosts the dialog (signing the user in first if needed).

**Feedback is opt-in.** Users can only send feedback if it's enabled for your app. Apps created in the Dev Center have feedback enabled at creation — you can turn it off with the "User Feedback" toggle in the app's settings. Apps created through `mixt.apps.create` default to off; enable it by setting `feedbackEnabled`:

```js
await mixt.apps.update('my-app', { feedbackEnabled: true });
```

If feedback isn't enabled, the dialog tells the user the app isn't accepting feedback. To protect you and your users, Mixt OS enforces limits on the size and frequency of feedback messages.

## Syntax
```js
mixt.ui.showFeedbackDialog()
```

## Parameters
None.

## Return value
A `Promise` that resolves to `true` if the user submitted feedback, and `false` if the dialog was dismissed or feedback is unavailable. It never rejects.

On a website that is cross-origin isolated (COOP severs the popup's connection to your page), the promise resolves `false` even though the popup stays open and the user may still submit their feedback there. Treat `false` as "not confirmed", not "not sent".

## Examples

```html;ui-show-feedback-dialog
<html>
<body>
    <button id="feedback">Send us feedback</button>
    <script src="/mixt.js/v2"></script>
    <script>
        document.getElementById('feedback').addEventListener('click', async () => {
            const sent = await mixt.ui.showFeedbackDialog();
            if (sent) {
                mixt.print('Thanks for your feedback!');
            }
        });
    </script>
</body>
</html>
```
