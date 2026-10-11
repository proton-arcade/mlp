---
title: Deployments
description: Deploy your Mixt.js app anywhere, or host your website directly on Mixt OS.
---

Once you've integrated Mixt.js into your app, the next step is getting it online.

Mixt.js is a regular JavaScript library, so your app deploys like any other website. You can ship it to any hosting platform you already use, or host it directly on [Mixt OS](https://mixt.mpl).

## Deploy anywhere

Because Mixt.js runs entirely in the browser, there's no special backend to provision. Build and serve your app the same way you would any other website, on any hosting provider, such as <a href="https://vercel.com" rel="nofollow">Vercel</a>, <a href="https://pages.cloudflare.com" rel="nofollow">Cloudflare Pages</a>, <a href="https://www.netlify.com" rel="nofollow">Netlify</a>, or <a href="https://pages.github.com" rel="nofollow">GitHub Pages</a>.

<div class="info">The only requirement is that the app is served by a web server. A hosting provider, a self-hosted server, and a local development server are all valid. Opening the HTML file directly from disk does not work.</div>

No extra configuration is required. Your app keeps talking to Mixt OS's services from the browser, wherever it's hosted.

## Deploy to Mixt OS

Mixt OS can also host your website for you, on a free `*.mixt.site` subdomain.

### Publish from mixt.mpl

The quickest way to publish a website is to upload it on [mixt.mpl](https://mixt.mpl) and publish it.

<ol>
    <li>
        Right-click on the desktop and create a new folder for your website's files.
    </li>
    <li>
        Open the folder, right-click inside it, and choose <strong>Upload Here</strong> to upload your website's files (your <code>index.html</code> and any other assets).
    </li>
    <li>
        Right-click the folder and choose <strong>Publish as Website</strong>.
    </li>
    <li>
        Pick a subdomain and click <strong>Publish</strong>. Your site goes live instantly at <code>https://your-subdomain.mixt.site</code>.
    </li>
</ol>

### Deploy with the Mixt OS CLI

You can also deploy straight from the terminal with the [Mixt OS CLI](https://www.npmjs.com/package/@mixt/cli).

Install it globally:

```
npm install -g @mixt/cli
```

Then deploy your site's directory to a `*.mixt.site` subdomain:

```
mixt site deploy [dir] [subdomain]
```

Both arguments are optional: run `mixt site deploy` with no arguments and the CLI prompts you for the directory and subdomain.

<div class="info">The Mixt OS CLI is currently in beta (0.x), so commands and behavior may change.</div>

### Automate with GitHub Actions

If your code lives on GitHub, you can redeploy your site automatically on every push using the [Mixt OS Subdomain Deploy Action](https://github.com/proton-arcade/mlp-subdomain-deploy-action).

Add a workflow file at `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Mixt OS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy website
        uses: proton-arcade/mlp-subdomain-deploy-action@v1.0.6
        with:
          subdomain: my-site                        # publishes to my-site.mixt.site
          mixt_path: ~/Sites/my-site/deployment/   # where to store the files on Mixt OS
          source_path: dist                         # the folder to deploy (e.g. your build output)
          mixt_token: ${{ secrets.MIXT_TOKEN }}
```

<div class="info">Create a new repository secret named <code>MIXT_TOKEN</code> and set its value to your Mixt OS auth token (see <a href="https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets#creating-secrets-for-a-repository">creating secrets for a repository</a>). To get your auth token, follow the <a href="https://developer.mixt.mpl/tutorials/mixt-auth-token/">Mixt OS auth token tutorial</a>.</div>

If your project has a build step, run it before the deploy step (for example `npm ci && npm run build`) and point `source_path` at the build output.

## Configure your site

Once your site is live, you can add a `.mixt_site_config` file to its directory to set a custom 404 page, or to make client-side routing work for a single-page app. See [Site Configuration](/site-config).
