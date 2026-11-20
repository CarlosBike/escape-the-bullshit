# Escape the Bullshit — website

A plain HTML, CSS and JavaScript website. Fast, private, no tracking, no advertising, and no database you have to pay for.

You can edit it three ways, and they all write to the same files:

1. **The editing screen** — a browser page that looks like a normal website editor. No code needed.
2. **A plain text editor** — every page is a text file you can open in Notepad.
3. **Ask me** — send me a message and I'll make the change for you.

---

## 1. What you need

- **Node.js** — one download from [nodejs.org](https://nodejs.org). Choose the **LTS** version, the one marked "Recommended for most users". Run the installer and accept the defaults. You only need this once.

Nothing else. No account, no hosting, no cost.

---

## 2. The daily routine

Open a terminal in your site folder, then run two commands.

**Windows**

- Right-click the folder → **Open in Terminal** (Windows 11), or **Open PowerShell window here** (Windows 10).
- Or open PowerShell anywhere and type `cd` followed by the folder path.

**Mac**

- Right-click the folder → **New Terminal at Folder**.

Then:

```powershell
npm run build
npm run serve
```

- `npm run build` turns your content files into the finished website.
- `npm run serve` starts a local preview.

Then open your browser:

| What | Where |
|---|---|
| The website | `http://localhost:8000` |
| The editing screen | `http://localhost:8000/admin/` |

Press **Ctrl+C** in the terminal to stop the preview. Run `npm run serve` again whenever you want to look at the site.

**If PowerShell says `npm is not recognised`** — close the terminal, open a new one, and try again. Node installs its path when it installs, so a terminal opened beforehand won't know about it.

---

## 3. Editing content

### The editing screen

Go to `http://localhost:8000/admin/`, sign in, and you will see **Pages** and **Topics** in the sidebar.

- **Topics** — the twelve articles. Each one is a set of labelled boxes: the title, the short description, the introduction, the claim, the alternatives, who is responsible, what we need them to do, whether they have done it yet, the sources, and the note about professional advice.
- **Pages** — Home, Lists, About, Contact, People's Voices, Privacy and Terms.

Change the wording in a box, press **Save**, and it is stored.

**Important:** the editing screen saves to GitHub, not to your computer. After saving, run `npm run sync` in the terminal to pull the change down and rebuild, then reload the page in your browser.

### A plain text editor

Every article is one file. Open it in Notepad and edit it directly.

```text
content\topics\broadband.md
```

The text at the top is the metadata:

```yaml
title: Broadband
navTitle: Broadband
blurb: Stop paying for a fixed broadband line you don't need.
order: 2
featured: true
```

The text below is the article, one field per section:

```yaml
lead: >
  A fixed broadband contract is an easy expense to overlook...
claim: >
  Most people use a tiny fraction of the data their fixed line provides...
```

Save the file, run `npm run build`, reload your browser. Done.

**Two rules for editing by hand:**

- A `>` on its own line means "the text on the following indented lines is one paragraph". Keep the indentation.
- Lines that start with two spaces belong to the paragraph above. Lines with no indentation start a new field.

---

## 4. Adding a new article

There are two steps: creating the file, and telling the editing screen about it.

**1. Copy an existing file.** For example, copy `content\topics\broadband.md` to `content\topics\my-new-topic.md`.

**2. Open the copy and change:**

- `title` — the heading on the page.
- `navTitle` — the shorter name in the menu (optional).
- `blurb` — one line describing it. This shows in the lists.
- `order` — a number that decides the order. Lower comes first. Use `13` for a new one, then renumber if you want it higher.
- `featured: true` — only if you want it on the home page.

Then rewrite the text under each field.

**3. Add it to the editing screen.** Open `admin\config.yml`, find the **Topics** section, and copy any block from it — for example the Broadband one — pasting the copy at the end of the list. Then change three lines:

```yaml
      - name: my-new-topic
        label: "My New Topic"
        file: content/topics/my-new-topic.md
```

**4. Run `npm run build`.**

That's it. The article appears in the lists, gets its own page at `/topics/my-new-topic/`, and shows up in the editing screen.

**The file name is the address.** `my-new-topic.md` becomes `/topics/my-new-topic/`. If you rename the file, the old address stops working.

---

## 5. Adding a new page

Same idea.

**1. Copy `content\pages\about.md` to `content\pages\new-page.md`.**

**2. Set in the text at the top:**

```yaml
title: My New Page
navLabel: New Page
order: 8
nav: true
description: One sentence for search results.
```

**3. Write the page content below.**

**4. Add it to `admin\config.yml`** in the **Pages** section, the same way as for an article:

```yaml
      - name: new-page
        label: "New Page"
        file: content/pages/new-page.md
```

**5. Run `npm run build`.**

Set `nav: false` if you want the page to exist without appearing in the menu.

**Links between pages** use a simple form:

```html
<a href="page:lists">See the lists</a>
```

and links to articles use:

```html
<a href="topic:broadband">Broadband</a>
```

The build turns those into the right address on every page, including the article pages. You can also write them as ordinary Markdown links — `[See the lists](page:lists)`.

**Your email address** is written as `[[email]]` anywhere in the text. The build fills it in from `content\site.json`, so you only ever change it in one place.

---

## 6. Site-wide settings

`content\site.json` holds the things that appear in more than one place:

```json
{
  "title": "Escape the Bullshit",
  "tagline": "Free up your life",
  "email": "engineerone500@hotmail.co.uk",
  "year": 2026,
  "hero": { "image": "...", "title": "...", "text": "..." },
  "donateUrl": "https://square.link/u/tGMvCBvv?src=embed",
  "social": { "facebook": "", "twitter": "", "instagram": "" }
}
```

**Change your email address here**, and it updates everywhere — including the Privacy Policy and Terms pages.

---

## 7. Changing the look

The colours and spacing are all at the top of `static\style.css`:

```css
:root {
  --bg: #f7f6f3;
  --accent: #b3401f;
  ...
}
```

Change `--accent` and the buttons and links change colour. The site automatically uses a dark theme when your device is set to dark mode.

---

## 8. GitHub — what it is and why

**GitHub stores your website files.** That is all it does. Think of it as a very reliable backup of the folder on your computer, plus a record of every change you have ever made.

That record is the useful part. If you edit something and make a mess of it, you can look at what it was before and undo it. If your computer dies, your site is still there.

**The editing screen writes to GitHub.** It cannot write to your computer directly, because a web page in your browser is not allowed to reach out and change files on your hard drive. GitHub is the meeting point: the screen saves there, and `npm run sync` copies it back down to your computer and rebuilds.

### Setting it up, once

**1. Create the repository.** On github.com, click **New repository**. Name it `escape-the-bullshit`. Set it to **Private** for now — you can make it public later.

**2. Install Git.** Download from [git-scm.com/download/win](https://git-scm.com/download/win) (Windows) or run `xcode-select --install` in Terminal (Mac).

**3. Send your files to GitHub.** In the terminal, in your site folder:

```powershell
git init
git add .
git commit -m "First version of the site"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/escape-the-bullshit.git
git push -u origin main
```

Replace `YOUR-USERNAME` with your GitHub username.

If Git asks for a password, use a **Personal Access Token**, not your account password. GitHub will offer to create one — give it permission to read and write that one repository, then paste the token in when asked.

**4. Tell the editing screen where your repository is.** Open `admin\config.yml` and change one line:

```yaml
repo: YOUR-USERNAME/escape-the-bullshit
```

**5. Restart the preview** and open `http://localhost:8000/admin/`.

### The everyday loop

```text
   You edit in the browser
            |
            v
   Saved to GitHub (a new commit)
            |
            v
   npm run sync   (pulls it down, rebuilds)
            |
            v
   Reload your browser to see it
```

---

## 9. The folder

```text
content/
  site.json          settings for the whole site
  pages/             7 pages: home, lists, about, contact, people, privacy, terms
  topics/            12 articles, one file each
static/
  style.css          all the styling
  site.js            menu, form, counter, poll
  uploads/           images you add through the editing screen
admin/
  index.html         the editing screen
  config.yml         how the editing screen is set up
tools/
  build.js           turns content into the website
  serve.js           the local preview
  markdown.js        renders the text
  yaml.js            reads the settings at the top of each content file
  sync.js            pull from GitHub, then build
  check.js           checks the content without building
package.json
dist/                the finished website (generated — never edit this)
```

**Never edit anything in `dist/`.** It is deleted and rebuilt every time.

---

## 10. Commands

| Command | What it does |
|---|---|
| `npm run build` | Build the website into `dist/` |
| `npm run serve` | Preview at `http://localhost:8000` |
| `npm run sync` | Pull from GitHub, then build |
| `npm run check` | Check the content files for mistakes |

---

## 11. What is deliberately not finished

**The contact form does not send anything.** It checks the form and shows a confirmation, but there is no server behind it. When you publish, you have three choices:

1. Use Netlify Forms — you paste one line into the form.
2. Use a form service such as Formspree.
3. Replace the form with a plain email address.

**The People's Voices counter and poll are local only.** They count in your own browser and go nowhere. When the site is live, they need a shared counter service or a small backend.

**Publishing.** Not set up yet. When you are ready: connect the GitHub repository to Netlify or Cloudflare Pages, set the build command to `npm run build` and the publish directory to `dist/`. The same commit you test locally becomes the live site.

**Social links.** There are no social icons yet. The addresses go in `content\site.json` under `social`, ready for when you have them.

---

## 12. Before you publish

- [ ] Read every page once, and click every link.
- [ ] Check the contact form works.
- [ ] Update the Privacy Policy to name the hosting provider you actually use.
- [ ] Update the email address in `content\site.json`.
- [ ] Set `site_url` in `admin\config.yml` to your real address.
- [ ] Check the wording on the health and dental pages still says when to ask a professional.
- [ ] Publish.

---

## 13. A note on the writing

Several articles cover health, dental and financial matters. They are written to be accurate, and they say plainly when a question needs a doctor, a dentist or a qualified adviser rather than a website.

**Please keep those notes in place when you rewrite a page.** They matter for the reader, and they matter for the site's credibility — a site that says "ask your dentist" is trusted more than one that says "do this instead".
