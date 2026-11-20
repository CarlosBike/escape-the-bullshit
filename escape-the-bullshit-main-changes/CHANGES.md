# Changed files

## What changed in this bundle

### admin/config.yml — rewritten

The backend is now the **GitHub** backend:

```yaml
backend:
  name: github
  repo: CarlosBike/escape-the-bullshit
  branch: main
  base_url: https://api.github.com
```

The previous `git-gateway` backend was removed by Sveltia and produced the
error *"The deprecated Git Gateway backend is not supported in Sveltia CMS."*
Sveltia talks to GitHub directly, so no hosting provider and no Netlify
Identity setup is needed. `site_url` and `display_url` now point at
`http://localhost:8000`, because that is where the screen is used. The
comment block at the top of the file has been rewritten to match.

### admin/index.html — rewritten

The wording now describes signing in with GitHub, and explains what to do if
a token is requested instead. The script loader is unchanged: it tries the
local copy, then unpkg.com, then jsDelivr, and reports each one by name so a
failure is visible rather than mysterious.

### .gitignore — new

Build output should not be committed. The `dist/` folder is regenerated on
every build, and a stale copy of `admin/config.yml` inside it is a genuine
trap — it can contain an old backend setting while the source file has been
corrected.

```
dist/
node_modules/
.netlify/
.DS_Store
```

### README.md — sections 2, 3 and 8 rewritten

The Netlify-specific instructions have been replaced with the GitHub-backend
flow. The editing screen is now described as running at
`http://localhost:8000/admin/`, with sign-in via GitHub, followed by
`npm run sync` to pull the change back down and rebuild. Publishing has been
moved to its own short section, marked as a separate decision that does not
affect editing.

## How to use it

```text
npm run serve          →  http://localhost:8000/admin/  →  Log in with GitHub
```

Edit a topic, press **Save**. Sveltia commits to GitHub. Then:

```text
npm run sync           →  pulls the change down and rebuilds
```

## Not changed

The article text, the page text, the styling and the build tooling are all
exactly as they were. This bundle changes only how the editing screen is
configured and how it is documented.

## Still to do

- **Adding a brand new topic or page** needs one small block copied into
  `admin/config.yml`. The collections list each file individually rather than
  using a folder pattern.
- **Publishing** is not done. Point any static host at the repository when
  you are ready; build command `npm run build`, publish directory `dist`.
- **The contact form** does not send anything, and the People's Voices
  counter is local to each browser. Both need a live backend.
