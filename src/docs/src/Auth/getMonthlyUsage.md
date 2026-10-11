---
title: mixt.auth.getMonthlyUsage()
description: Get the user's current monthly resource usage in the Mixt OS ecosystem.
platforms: [websites, apps, nodejs, workers]
---

Get the user's current monthly resource usage in the Mixt OS ecosystem.

<div class="info">

When called from an app, `usage` and `appTotals` cover only that app's own usage. `allowanceInfo` is the user's allowance for the whole account.

</div>

## Syntax

```js
mixt.auth.getMonthlyUsage()
```

## Parameters

None

## Return value

A `Promise` that resolves to a [`MonthlyUsage`](/Objects/monthlyusage) object containing the user's monthly usage information.

## Example

```html;auth-get-monthly-usage
<html>
  <body>
    <script src="/mixt.js/v2"></script>
    <script>
      mixt.auth.getMonthlyUsage().then(function (usage) {
        mixt.print(`<pre>${JSON.stringify(usage, null, 2)}</pre>`);
      });
    </script>
  </body>
</html>

```
