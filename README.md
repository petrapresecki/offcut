# Offcut

A library for graphic designers: save the posters, packaging, type and photos that inspire you, find them again by colour, and turn them into moodboards.

Built with Next.js (App Router) on Cloudflare Workers, D1, R2, Drizzle, Tailwind and Motion.

## Run it locally

No Cloudflare account needed: D1 and R2 run locally (stored in `.wrangler/`).

```sh
pnpm install
pnpm db:migrate:local
pnpm dev
```

Open http://localhost:3000 and sign in with any email. Without an email key, the sign-in link is printed in the terminal and shown on the page.

## What works so far

- Magic-link sign in (one-time links, hashed tokens and sessions)
- Saving images by drag and drop anywhere on the page, pasting with ⌘V, or choosing files
- In the browser, before upload: a thumbnail, a colour palette (median cut) and a perceptual hash
- A warning when an image is already in the library, even resized or recompressed
- Masonry library
- Search by colour (presets or any colour), text search over notes, titles, credits and tags, category and tag filters; all kept in the URL
- Tags with suggestions; boards with cover mosaics, rename and delete; select several images to add to a board; dropping images on a board page saves them to that board
- Detail view: palette chips that copy as HEX, RGB or CMYK; title, note, category, tags, boards, credit and source, saved as you go; “Find colour” from any swatch; ← / → between images; delete

- Moodboards: drag a board's images onto an artboard (A4, A3, 16:9, square or portrait), move, resize, layer, arrange automatically, pick a background, and export a print-ready PDF with a credits page
- Presentation mode for any board (moodboard first, then each image; arrows, swipe, full screen)
- Share a board with a client by link: no account needed to view, present, vote 👍/👎 and leave notes; feedback shows on the board page; stop sharing revokes the link
- Landing page with scroll-driven GSAP scenes and a live colour-search demo

## Deploy to Cloudflare

```sh
pnpm wrangler d1 create offcut          # put the id into wrangler.jsonc
pnpm wrangler r2 bucket create offcut-images
pnpm db:migrate:remote
pnpm wrangler secret put RESEND_API_KEY # for sign-in emails
pnpm deploy
```

Set `APP_URL` in `wrangler.jsonc` to the deployed URL.

## Scripts

| Script | |
|---|---|
| `pnpm dev` | Next.js dev server with local Cloudflare bindings |
| `pnpm preview` | Build for Workers and run it locally in workerd |
| `pnpm db:generate` | New migration from `src/db/schema.ts` |
| `pnpm db:migrate:local` / `:remote` | Apply migrations |
| `pnpm cf-typegen` | Regenerate binding types after changing `wrangler.jsonc` |
| `pnpm typecheck`, `pnpm lint` | |
