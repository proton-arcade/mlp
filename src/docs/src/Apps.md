---
title: Apps
description: Create, manage, and interact with applications in Mixt OS desktop OS.
---

The Apps API allows you to create, manage, and interact with applications in the Mixt OS ecosystem. You can build and deploy applications that integrate seamlessly with Mixt OS's platform.

## Features

<div style="overflow:hidden; margin-bottom: 30px;">
    <div class="example-group active" data-section="create"><span>Create App</span></div>
     <div class="example-group" data-section="list"><span>List App</span></div>
    <div class="example-group" data-section="delete"><span>Delete App</span></div>
    <div class="example-group" data-section="update"><span>Update App</span></div>
    <div class="example-group" data-section="get"><span>Get Information</span></div>

</div>

<div class="example-content" data-section="create" style="display:block;">

#### Create an app pointing to example.com

```html;app-create
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
        (async () => {
            // (1) Generate a random app name
            let appName = mixt.randName();

            // (2) Create the app and prints its UID to the page
            let app = await mixt.apps.create(appName, "https://example.com");
            mixt.print(`Created app "${app.name}". UID: ${app.uid}`);

            // (3) Delete the app (cleanup)
            await mixt.apps.delete(appName);
        })();
    </script>
</body>
</html>
```

</div>

<div class="example-content" data-section="list">

#### Create 3 random apps and then list them

```html;app-list
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
        (async () => {
            // (1) Generate 3 random app names
            let appName_1 = mixt.randName();
            let appName_2 = mixt.randName();
            let appName_3 = mixt.randName();

            // (2) Create 3 apps
            await mixt.apps.create(appName_1, 'https://example.com');
            await mixt.apps.create(appName_2, 'https://example.com');
            await mixt.apps.create(appName_3, 'https://example.com');

            // (3) Get all apps (list)
            let apps = await mixt.apps.list();

            // (4) Display the names of the apps
            mixt.print(JSON.stringify(apps.map(app => app.name)));

            // (5) Delete the 3 apps we created earlier (cleanup)
            await mixt.apps.delete(appName_1);
            await mixt.apps.delete(appName_2);
            await mixt.apps.delete(appName_3);
        })();
    </script>
</body>
</html>
```

</div>

<div class="example-content" data-section="delete">

#### Create a random app then delete it

```html;app-delete
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
        (async () => {
            // (1) Generate a random app name to make sure it doesn't already exist
            let appName = mixt.randName();

            // (2) Create the app
            await mixt.apps.create(appName, "https://example.com");
            mixt.print(`"${appName}" created<br>`);

            // (3) Delete the app
            await mixt.apps.delete(appName);
            mixt.print(`"${appName}" deleted<br>`);

            // (4) Try to retrieve the app (should fail)
            mixt.print(`Trying to retrieve "${appName}"...<br>`);
            try {
                await mixt.apps.get(appName);
            } catch (e) {
                mixt.print(`"${appName}" could not be retrieved<br>`);
            }
        })();
    </script>
</body>
</html>
```

</div>

<div class="example-content" data-section="update">

#### Create a random app then change its title

```html;app-update
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
        (async () => {
            // (1) Create a random app
            let appName = mixt.randName();
            await mixt.apps.create(appName, "https://example.com")
            mixt.print(`"${appName}" created<br>`);

            // (2) Update the app
            let updated_app = await mixt.apps.update(appName, {title: "My Updated Test App!"})
            mixt.print(`Changed title to "${updated_app.title}"<br>`);

            // (3) Delete the app (cleanup)
            await mixt.apps.delete(appName)
        })();
    </script>
</body>
</html>
```

</div>

<div class="example-content" data-section="get">

#### Create a random app then get it

```html;app-get
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
        (async () => {
            // (1) Generate a random app name to make sure it doesn't already exist
            let appName = mixt.randName();

            // (2) Create the app
            await mixt.apps.create(appName, "https://example.com");
            mixt.print(`"${appName}" created<br>`);

            // (3) Retrieve the app using get()
            let app = await mixt.apps.get(appName);
            mixt.print(`"${appName}" retrieved using get(): id: ${app.uid}<br>`);

            // (4) Delete the app (cleanup)
            await mixt.apps.delete(appName);
        })();
    </script>
</body>
</html>
```

</div>

## Functions

These Apps API are supported out of the box when using Mixt.js:

- **[`mixt.apps.create()`](/Apps/create/)** - Create a new application
- **[`mixt.apps.list()`](/Apps/list/)** - List all applications
- **[`mixt.apps.delete()`](/Apps/delete/)** - Delete an application
- **[`mixt.apps.update()`](/Apps/update/)** - Update application settings
- **[`mixt.apps.get()`](/Apps/get/)** - Get information about a specific application
- **[`mixt.apps.checkName()`](/Apps/checkName/)** - Check whether an app name is available

## Examples

You can see various Mixt.js Apps API in action from the following examples:

- Create
  - [Create an app pointing to https://example.com](/playground/app-create/)
- List
  - [Create 3 random apps and then list them](/playground/app-list/)
- Delete
  - [Create a random app then delete it](/playground/app-delete/)
- Update
  - [Create a random app then change its title](/playground/app-update/)
- Get
  - [Create a random app then get it](/playground/app-get/)
- Sample Apps
  - [To-Do List](/playground/app-todo/)
