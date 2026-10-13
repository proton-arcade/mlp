#!/usr/bin/env node
// Builds internet/index.json, the search index behind MPLmit.
//
// Every folder directly inside internet/ that has an index.html is one site.
// To add a site, create a folder there. To remove one, delete its folder.
// `node server.cjs` runs this on every start; run `node tools/buildInternet.mjs`
// to refresh the index without restarting.
//
// Optional internet/<site>/site.json overrides what the search reads:
//   { "title": "...", "description": "...", "keywords": ["...", "..."] }
// Without it, the title comes from <title>, and the description from
// <meta name="description">.

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const internetDir = path.join(rootDir, 'internet');
const INDEX_FILE = path.join(internetDir, 'index.json');
const SITE_URL_PREFIX = '/builtin/internet';
const TEXT_LIMIT = 4000;

const decode = (s) => s
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

const plainText = (html) => decode(html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();

const metaContent = (html, name) => {
    const m = html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i'));
    return m ? decode(m[1]).trim() : '';
};

const titleOf = (html) => {
    const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    return m ? plainText(m[1]) : '';
};

const readSiteConfig = (dir, id) => {
    const file = path.join(dir, 'site.json');
    if (!existsSync(file)) return {};
    try {
        return JSON.parse(readFileSync(file, 'utf8'));
    } catch (err) {
        console.warn(`[internet] ${id}/site.json is not valid JSON, ignoring it: ${err.message}`);
        return {};
    }
};

const sites = [];
if (existsSync(internetDir)) {
    for (const entry of readdirSync(internetDir, { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
        const dir = path.join(internetDir, entry.name);
        const indexFile = path.join(dir, 'index.html');
        if (!existsSync(indexFile)) {
            console.warn(`[internet] skipped "${entry.name}": no index.html`);
            continue;
        }
        const html = readFileSync(indexFile, 'utf8');
        const cfg = readSiteConfig(dir, entry.name);
        sites.push({
            id: entry.name,
            title: String(cfg.title || titleOf(html) || entry.name),
            description: String(cfg.description || metaContent(html, 'description') || ''),
            keywords: Array.isArray(cfg.keywords) ? cfg.keywords.map(String) : [],
            url: `${SITE_URL_PREFIX}/${encodeURIComponent(entry.name)}/index.html`,
            text: plainText(html).slice(0, TEXT_LIMIT),
        });
    }
}

sites.sort((a, b) => a.title.localeCompare(b.title));
writeFileSync(INDEX_FILE, JSON.stringify({ generated_at: new Date().toISOString(), sites }, null, 2) + '\n');
console.log(`[internet] indexed ${sites.length} site(s)`);
