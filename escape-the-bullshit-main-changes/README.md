# Escape the Bullshit

A fast, plain, advertisement-free website. No database, no tracking, no adverts.
Twelve topic articles, seven ordinary pages, and two editing screens.

---

## 1. What you need

**Node.js** — one download from [nodejs.org](https://nodejs.org). Take the
"LTS" version. That is the only thing you need to install. You have it already.

Everything else runs from a terminal window.

---

## 2. Your daily routine

Open a terminal in the project folder (see section 11 if you are not sure how),
then:

```powershell
npm run build     # assemble the site into the dist/ folder
npm run serve     # start the preview at http://localhost:8000
```

Then open:

| What | Where |
|---|---|
| The website | <http://localhost:8000> |
| The built-in editing screen | <http://localhost:8000/admin/editor.html> |
| The Sveltia editing screen | <http://localhost:8000/admin/> — sign in with GitHub |

**To stop the preview server:** press `Ctrl+C` in the terminal.

**If you see "address already in use :::8000"** — an older copy of the server is
still running. Close that other terminal window, or press `Ctrl+C` in it, then
run `npm run serve` again.

---

## 3. Three ways to change content

They all write to the same files, so use whichever you like.

**A. The built-in editing screen** (easiest). Open
`http://localhost:8000/admin/editor.html`. Pick a topic or page from the list on
the left, type in the labelled boxes on the right, press **Save and rebuild**.
The site is rebuilt on the spot.

**B. The Sveltia screen** (the full editing interface). Open
<http://localhost:8000/admin/> and sign in with GitHub. It looks and behaves
like a proper content management system, with a labelled box for every
section of an article, and it saves straight into your GitHub repository. See
section 8.

**C. A text editor.** Open any file in `content/` in Notepad and change the
words. Run `npm run build` afterwards. Useful for copying a whole article.

---

## 4. Adding a new topic (article)

1. Copy any file in `content/topics/` — say `broadband.md` — and name the copy
   after your new topic, e.g. `energy- bills.md` should be `energy-bills.md`
   (lowercase, hyphens, no spaces).
2. Open it and change the `title`, `navTitle`, `blurb` and `order`. Leave the
   section headings alone.
3. Run `npm run build`.
4. To make it appear in the editing screen, copy a block in
   `admin/config.yml` (the `topics` list) and change its `file` and `label`.
   Or just ask me to do it.

The sections mean:

| Field | What it is for |
|---|---|
| `title` | The heading on the page |
| `navTitle` | Shorter label if the title is long |
| `blurb` | One line, shown in the list of topics |
| `order` | Lower numbers come first |
| `featured` | Tick to show it on the home page |
| `lead` | The short introduction |
| `claim` | What is being said, and what is really true |
| `alternatives` | What to do instead |
| `responsible` | Who is responsible |
| `demand` | What we need them to do |
| `status` | Have they done it yet? |
| `sources` | Where the reader can check it themselves |
| `advice` | When to speak to a doctor, dentist or adviser |

---

## 5. Adding a new page

Same idea. Copy a file in `content/pages/` — `about.md` is a good plain one —
name the copy after your page, give it a `title`, a `description` and an
`order`, write the body underneath the `---` lines, then run `npm run build`.

---

## 6. Site-wide settings

`content/site.json` holds the things that appear across the whole site: the
site title, the tagline, your email address, the picture at the top of the
home page, the donate link and your social links. Change your email there and
it changes everywhere at once.

---

## 7. Changing the look

`static/style.css`. The colours are in the `:root` block at the very top:

```css
--accent: #b3401f;   /* the main colour */
--bg:     #f7f6f3;   /* the page background */
```

Change the value, run `npm run build`, and look. The dark version of the site
is further down the file, under `prefers-color-scheme: dark`.

---

## 8. GitHub and Netlify

### What GitHub is for

It holds a copy of your site and a record of every change you make. If you
break something, you can go back to an earlier version. You have already put
the site there.

### What Netlify is for

Netlify turns the GitHub copy into a live website and rebuilds it whenever you
save something in the editing screen.

### Signing in to the editing screen

The editing screen is Sveltia, a free open-source tool that runs in your
browser and talks to GitHub directly. It needs no hosting provider and no
database.

1. Start the preview on your own computer: `npm run serve`
2. Open <http://localhost:8000/admin/>
3. Press **Log in with GitHub** and approve access to that one repository.

That is all. You are now editing the site. Pick a topic from the list, change
the wording in the labelled boxes, press **Save**, and Sveltia commits the
change to GitHub for you.

If the screen asks for a token instead of showing a GitHub button, create a
fine-grained token in GitHub under **Settings → Developer settings → Personal
access tokens**, limited to `CarlosBike/escape-the-bullshit`, with
**Contents: read and write**. GitHub shows the token only once.

**After saving**, run `npm run sync` on your own computer. That pulls the
change down from GitHub and rebuilds the site, so what you see locally
matches what you just wrote.

### Publishing the site later

Publishing is a separate decision and does not affect editing. When you want a
public address, point any static host at the same GitHub repository:

- **Netlify** — import the repository, build command `npm run build`,
  publish directory `dist`. `netlify.toml` already sets both.
- **Cloudflare Pages** — connect the repository, same two settings.
- **GitHub Pages** — needs one extra workflow file; ask and I will write it.

Whichever you choose, the editing screen keeps working exactly as it does
now, because it talks to GitHub and not to the host.

### If sign-in does not work

Check these three things, in this order:

| Check | Where |
|---|---|
| The backend is the GitHub one | `admin/config.yml` → `name: github` |
| The repository is named correctly | `admin/config.yml` → `repo: CarlosBike/escape-the-bullshit` |
| The branch is right | `admin/config.yml` → `branch: main` |

The old Netlify "Git Gateway" backend is no longer supported by Sveltia and
must not be used.

### The rhythm after that

```text
edit in the screen  →  save  →  Netlify rebuilds  →  site updates
```

Nothing is needed from your computer for that to happen. If you also want the
change on your own computer, run `npm run sync` there.

---

## 9. Folder layout

```text
content/          all the words - safe to edit
  site.json       settings for the whole site
  pages/          the 7 ordinary pages
  topics/         the 12 articles
static/           style.css, site.js, uploaded images
admin/            the editing screens and their settings
tools/            the small programs that build the site
dist/             the finished site - do not edit, it is overwritten
netlify.toml      the build settings Netlify uses
```

---

## 10. Commands

| Command | What it does |
|---|---|
| `npm run build` | Assembles the site into `dist/` |
| `npm run serve` | Starts the preview at `localhost:8000` |
| `npm run check` | Checks the content files for missing fields, without building |
| `npm run sync` | Pulls changes from GitHub and rebuilds |

---

## 11. Opening a terminal in a folder

**Windows 11:** right-click the folder → **Open in Terminal**.

**Windows 10:** right-click the folder → **Open in Windows Terminal**, or
*Open PowerShell window here*. If that option is missing, open PowerShell
anywhere and type `cd` followed by the folder path.

PowerShell is fine — everything in this document works in it. You do not need
CMD, and Node.js does not have its own command prompt.

---

## 12. Deliberately not finished

**The contact form does not send anything yet.** It checks the form and shows
a confirmation. When you publish, it needs connecting to a real inbox
(Netlify Forms is the easy option) or replacing with a plain email address.

**The People's Voices counter and poll are stored only in your own browser.**
They count on your own device and go nowhere. A shared total needs a small
backend, which can be added later.

**Social links.** The placeholders are in `content/site.json`. Put your real
profile URLs in when you have them.

**Clean addresses.** Articles are currently at `/topics/broadband/`. Nicer
addresses such as `/broadband/` can be added later with redirect rules at the
hosting stage.

---

## 13. Before you publish

- [ ] Check the contact page works and says where messages should go.
- [ ] Read the Privacy Policy and Terms. They describe what the site actually
      does. If you add a form, a counter or an analytics script, they need
      updating to match.
- [ ] Put your real Netlify address into `site_url` and `display_url` in
      `admin/config.yml`.
- [ ] Check every page on a phone.
- [ ] Consider your own domain name later, through Netlify's domain settings.

---

## 14. A note on the writing

Several pages cover health, dental and financial matters. They say plainly
when a question needs a doctor, a dentist or a qualified adviser rather than
a website. Please keep those notes in place when you rewrite a page. They
matter for the reader, and they matter for the site's credibility.
