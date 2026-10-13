---
title: Add Website Publishing
description: "Learn how to let users publish websites from your app with Mixt.js."
tags: [hosting, fs]
order: 55
---

Some apps let users make something that belongs on the web, like a site
builder or a portfolio maker. When the user is done, they want it online at a
link they can share. Usually that means your app runs its own hosting, with
servers to store every user's files and a domain to serve them from.

With Mixt.js, your app publishes the site straight from the browser, like a
static host such as GitHub Pages. It writes the files into a folder in the
user's Mixt OS account with the [filesystem API](/FS/), then puts that folder
online at `https://<name>.mixt.site` with the [hosting API](/Hosting/). The
site lives in the user's account, so there is no server for you to run. Anyone
can open the link, with no sign in and no Mixt.js.

## Publish What the User Made

Turn the user's project into HTML, write it as `index.html` in a folder, then
pass a site name and the folder to
[`mixt.hosting.create()`](/Hosting/create/):

```js
function renderPage (project) {
    return `<!doctype html>
<title>${project.title}</title>
<h1>${project.title}</h1>
<p>${project.bio}</p>
<img src="photo.jpg">`;
}

const dir = `sites/${project.id}`;

await mixt.fs.write(`${dir}/index.html`, renderPage(project), { createMissingParents: true });
await mixt.fs.write(`${dir}/photo.jpg`, project.photo);

const site = await mixt.hosting.create('grace-portfolio', dir);

console.log(`https://${site.subdomain}.mixt.site`);
```

The site now serves the folder. A request for `/` gets `index.html`, and every
other file is served at its path, such as `photo.jpg` at `/photo.jpg`. Everything
in the folder is public, so write only what the user means to publish.

## Let the User Pick a Name

The site name becomes the site's address, and users type names with spaces,
capitals and accents. A name can use lowercase letters, digits and hyphens. It
cannot start or end with a hyphen, and it can be at most 64 characters long.
Turn what the user typed into a valid name before you call
[`mixt.hosting.create()`](/Hosting/create/):

```js
function toSiteName (text) {
    return text
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')    // é -> e
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 64)
        .replace(/^-+|-+$/g, '');
}

toSiteName("Grace's Portfolio!");    // 'grace-s-portfolio'
toSiteName('Café Menu 2026');        // 'cafe-menu-2026'
```

Show the result as the user types, so they see the address before they publish.

Site names are shared by every Mixt OS user, so the name the user wants may
already be taken. Some names, such as `www` and `api`, are reserved. In these
cases [`mixt.hosting.create()`](/Hosting/create/) rejects with a `conflict` or
`subdomain_reserved` error. Catch it to ask the user for another name, or let
[`mixt.randName()`](/Utils/randName/) pick one nobody has:

```js
async function createSite (dir, name) {
    try {
        return await mixt.hosting.create(toSiteName(name) || mixt.randName(), dir);
    } catch (e) {
        if (e?.code !== 'conflict' && e?.code !== 'subdomain_reserved') throw e;
        return await mixt.hosting.create(mixt.randName(), dir);
    }
}
```

## Remember Which Site Belongs to Which Project

When the user comes back to a project, your app needs to know whether it was
published and under which name. Save the site name with
[`mixt.kv.set()`](/KV/set/), keyed by the project:

```js
await mixt.kv.set(`site:${project.id}`, site.subdomain);
```

To find the site later, read it back with [`mixt.kv.get()`](/KV/get/). It
returns `null` for a project that was never published:

```js
const subdomain = await mixt.kv.get(`site:${project.id}`);
```

## Publish Again After Edits

A site serves whatever is in its folder, so publishing an edit means writing the
files again. There is nothing to redeploy. This `publish()` function handles
the first publish and every one after it:

```js
async function publish (project, name) {
    const dir = `sites/${project.id}`;

    await mixt.fs.write(`${dir}/index.html`, renderPage(project), { createMissingParents: true });
    await mixt.fs.write(`${dir}/photo.jpg`, project.photo);

    let subdomain = await mixt.kv.get(`site:${project.id}`);

    if (!subdomain) {
        const site = await createSite(dir, name);
        subdomain = site.subdomain;
        await mixt.kv.set(`site:${project.id}`, subdomain);
    }

    return `https://${subdomain}.mixt.site`;
}
```

To list the user's sites or take one offline, see
[Manage websites](/recipes/manage-websites/).

## Notes

- To give single files a public URL, such as images or downloads, see
  [Host files online](/recipes/host-file/). One hosted folder serves every file,
  with no page or site name to manage.
