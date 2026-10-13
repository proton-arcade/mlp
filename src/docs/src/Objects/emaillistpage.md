---
title: EmailListPage
description: One page of mailbox listing results from mixt.email.list().
---

An `EmailListPage` object is one page of results from [`mixt.email.list()`](/Email/list/).

## Attributes

#### `items` (Array)

An array of [`EmailSummary`](/Objects/emailsummary/) objects, newest first.

#### `cursor` (String) (optional)

A pagination cursor for the next page. Present only while more pages exist. Pass it as `cursor` to the next `mixt.email.list()` call to continue.

A page may hold fewer than `limit` items while `cursor` is still present — always iterate until `cursor` is absent rather than checking the page size.
