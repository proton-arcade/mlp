---
title: Hosting
description: Deploy and manage websites on Mixt OS.
---

The Mixt.js Hosting API enables you to host files on the internet and manage your hosting programmatically.

The API provides comprehensive hosting management features including creating, retrieving, listing, updating, and deleting hostings. It is mainly used to expose files to the internet, where users can get their content from a public URL and additionally with these capabilities, you can host many applications, such as website builders, static site generators, or deployment tools that require programmatic control over hosting infrastructure.

## Features

<div style="overflow:hidden; margin-bottom: 30px;">
    <div class="example-group active" data-section="create"><span>Create Hosting</span></div>
    <div class="example-group" data-section="list"><span>List Hosting</span></div>
    <div class="example-group" data-section="delete"><span>Delete Hosting</span></div>
    <div class="example-group" data-section="update"><span>Update Hosting</span></div>
    <div class="example-group" data-section="get"><span>Get Information</span></div>
</div>

<div class="example-content" data-section="create" style="display:block;">

#### Create a simple website displaying "Hello world!"

```html;hosting-create
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
        (async () => {
            // (1) Create a random directory
            let dirName = mixt.randName();
            await mixt.fs.mkdir(dirName)

            // (2) Create 'index.html' in the directory with the contents "Hello, world!"
            await mixt.fs.write(`${dirName}/index.html`, '<h1>Hello, world!</h1>');

            // (3) Host the directory under a random subdomain
            let subdomain = mixt.randName();
            const site = await mixt.hosting.create(subdomain, dirName)

            mixt.print(`Website hosted at: <a href="https://${site.subdomain}.mixt.site" target="_blank">https://${site.subdomain}.mixt.site</a>`);
        })();
    </script>
</body>
</html>
```

</div>

<div class="example-content" data-section="list">

#### Create 3 random websites and then list them

```html;hosting-list
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
        (async () => {
            // (1) Generate 3 random subdomains
            let site_1 = mixt.randName();
            let site_2 = mixt.randName();
            let site_3 = mixt.randName();

            // (2) Create 3 empty websites with the subdomains we generated
            await mixt.hosting.create(site_1, '.');
            await mixt.hosting.create(site_2, '.');
            await mixt.hosting.create(site_3, '.');

            // (3) Get all subdomains
            let sites = await mixt.hosting.list();

            // (4) Display the names of the websites
            mixt.print(sites.map(site => site.subdomain));

            // Delete all sites (cleanup)
            await mixt.hosting.delete(site_1);
            await mixt.hosting.delete(site_2);
            await mixt.hosting.delete(site_3);
        })();
    </script>
</body>
</html>
```

</div>

<div class="example-content" data-section="delete">

#### Create a random website then delete it

```html;hosting-delete
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
        (async () => {
            // (1) Create a random website
            let subdomain = mixt.randName();
            const site = await mixt.hosting.create(subdomain, '.')
            mixt.print(`Website hosted at: ${site.subdomain}.mixt.site (This is an empty website with no files)<br>`);

            // (2) Delete the website using delete()
            await mixt.hosting.delete(site.subdomain);
            mixt.print('Website deleted<br>');

            // (3) Try to retrieve the website (should fail)
            mixt.print('Trying to retrieve website... (should fail)<br>');
            try {
                await mixt.hosting.get(site.subdomain);
            } catch (e) {
                mixt.print('Website could not be retrieved<br>');
            }
        })();
    </script>
</body>
</html>
```

</div>

<div class="example-content" data-section="update">

#### Update a subdomain to point to a new directory

```html;hosting-update
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
        (async () => {
            // (1) Create a random website
            let subdomain = mixt.randName();
            const site = await mixt.hosting.create(subdomain, '.')
            mixt.print(`Website hosted at: ${site.subdomain}.mixt.site<br>`);

            // (2) Create a random directory
            let dirName = mixt.randName();
            let dir = await mixt.fs.mkdir(dirName)
            mixt.print(`Created directory "${dir.path}"<br>`);

            // (3) Update the site with the new random directory
            await mixt.hosting.update(subdomain, dirName)
            mixt.print(`Changed subdomain's root directory to "${dir.path}"<br>`);

            // (4) Delete the app (cleanup)
            await mixt.hosting.delete(subdomain)
        })();
    </script>
</body>
</html>
```

</div>

<div class="example-content" data-section="get">

#### Get a subdomain

```html;hosting-get
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
        (async () => {
            // (1) Create a random website
            let subdomain = mixt.randName();
            const site = await mixt.hosting.create(subdomain, '.')
            mixt.print(`Website hosted at: ${site.subdomain}.mixt.site (This is an empty website with no files)<br>`);

            // (2) Retrieve the website using get()
            const site2 = await mixt.hosting.get(site.subdomain);
            mixt.print(`Website retrieved: subdomain=${site2.subdomain}.mixt.site UID=${site2.uid}<br>`);

            // (3) Delete the website (cleanup)
            await mixt.hosting.delete(subdomain);
        })();
    </script>
</body>
</html>
```

</div>

## Functions

These hosting features are supported out of the box when using Mixt.js:

- **[`mixt.hosting.create()`](/Hosting/create/)** - Create a new hosting deployment
- **[`mixt.hosting.list()`](/Hosting/list/)** - List all hosting deployments
- **[`mixt.hosting.delete()`](/Hosting/delete/)** - Delete a hosting deployment
- **[`mixt.hosting.update()`](/Hosting/update/)** - Update hosting settings
- **[`mixt.hosting.get()`](/Hosting/get/)** - Get information about a specific deployment

## Examples

You can see various Mixt.js hosting features in action from the following examples:

- [Create a simple website displaying "Hello world!"](/playground/hosting-create/)
- [Create 3 random websites and then list them](/playground/hosting-list/)
- [Create a random website then delete it](/playground/hosting-delete/)
- [Update a subdomain to point to a new directory](/playground/hosting-update/)
- [Retrieve information about a subdomain](/playground/hosting-get/)
