# Offcut

Inspiration library for graphic designers (image-first: posters, packaging, branding, type). Petra's portfolio project; first user is a graphic-designer friend.

## Stack
Next.js 15 App Router on Cloudflare Workers via `@opennextjs/cloudflare`. D1 (SQLite) through Drizzle, images in R2, Tailwind v4, Motion.

## Commands
- `pnpm dev` — dev server; `initOpenNextCloudflareForDev()` in `next.config.ts` gives it local D1/R2
- `pnpm typecheck`, `pnpm lint` — run both before committing
- `pnpm db:generate` after changing `src/db/schema.ts`, then `pnpm db:migrate:local`
- `pnpm cf-typegen` after changing `wrangler.jsonc`

## Conventions
- Bindings: `DB` (D1), `UPLOADS` (R2). Not `IMAGES`: OpenNext reserves it for Cloudflare Images. Get them with `getDb()` / `getBucket()` / `getEnv()` from `src/db`
- Image work (thumbnail, palette, perceptual hash) happens in the browser in `src/lib/image.ts`: native image libraries don't run on Workers
- R2 keys are `<userId>/<itemId>/original.<ext>` and `thumb.jpg`; `/api/img/[...key]` only serves keys under the signed-in user's id
- Every query is scoped by `userId`. Server actions call `requireUser()` first
- Only hashes of sign-in tokens and session ids are stored
- Styling: tokens in `src/app/globals.css` (`paper sheet ink muted line accent danger`), `.label` for mono uppercase metadata, `.wordmark`, `.crop-marks` for the corner-mark motif. Images bring the colour; the interface stays paper and ink with one fluorescent pink accent
- Fonts: Archivo (variable width, used wide for display) and IBM Plex Mono
- Filters (`q`, `color`, `category`, `tag`) live in the URL and run in the browser over the loaded cards (`src/lib/filter.ts`). Fine for libraries up to a few thousand images; move to SQL if that changes
- Boards live under `/library/boards`; uploads from a board page are added to that board
- Landing page: `src/components/landing/`. GSAP via `src/lib/gsap.ts` (plugins registered once); every animation sits inside `gsap.matchMedia()` with `MOTION_OK`, so reduced motion gets the finished layout. Posters are generated SVGs (`posters.tsx`), never other people's work
- Moodboards: `/library/boards/[slug]/moodboard`. Positions live on `board_items` (x, y, w, h, z) in artboard units (1600 wide, see `src/lib/canvas.ts`); format and background on `boards`. The PDF is built in the browser with jsPDF (`src/lib/pdf.ts`, loaded on demand), with a credits page
- Sharing: `boards.isPublic` + `shareToken`; `/s/[token]` is public (no auth), and `/api/s/[token]/[...key]` serves only images of items on that board. Clearing the token revokes the link. Visitors vote and comment without an account (`src/app/s/actions.ts`); a random key in their localStorage marks their own votes and notes. No rate limiting yet
- Presentation: `src/components/Presentation.tsx`, used by `/library/boards/[slug]/present` and the shared page
- Conventional commits (`feat:`, `fix:`, `style:`, `chore:`)

## Roadmap
1. ✅ Foundation, auth, saving, library, detail view
2. Phone saving: installable app + Web Share Target
3. ✅ Search by colour, tags, text search, boards
4. ✅ Landing page with the motion showcase
5. Moodboard canvas ✅, PDF export ✅, presentation mode ✅, client feedback ✅, crop, pinned notes
6. Save from links, AI tags, typeface guess, "more like this"
