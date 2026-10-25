import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`);

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: createdAt(),
});

// Only hashes of sign-in tokens and session ids are stored, so a leaked database can't sign anyone in.
export const loginTokens = sqliteTable("login_tokens", {
  tokenHash: text("token_hash").primaryKey(),
  email: text("email").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
});

export const sessions = sqliteTable(
  "sessions",
  {
    idHash: text("id_hash").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export type Swatch = { hex: string; weight: number };

export const items = sqliteTable(
  "items",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    imageKey: text("image_key").notNull(),
    thumbKey: text("thumb_key").notNull(),
    mime: text("mime").notNull(),
    bytes: integer("bytes").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    palette: text("palette", { mode: "json" }).$type<Swatch[]>().notNull(),
    // 64-bit difference hash as 16 hex chars, for spotting near-identical images.
    phash: text("phash").notNull(),
    title: text("title"),
    note: text("note"),
    category: text("category"),
    sourceUrl: text("source_url"),
    credit: text("credit"),
    // Set when this item is a crop of another item.
    parentItemId: text("parent_item_id"),
    createdAt: createdAt(),
  },
  (t) => [index("items_user_created_idx").on(t.userId, t.createdAt)],
);

export const boards = sqliteTable(
  "boards",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
    shareToken: text("share_token"),
    // Moodboard artboard: a format id from src/lib/canvas.ts and a background colour.
    canvasFormat: text("canvas_format").notNull().default("a4"),
    canvasBg: text("canvas_bg").notNull().default("#f2efe8"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("boards_user_slug_idx").on(t.userId, t.slug)],
);

export const boardItems = sqliteTable(
  "board_items",
  {
    boardId: text("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    itemId: text("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    // Moodboard canvas placement; null until the item is placed on the canvas.
    x: integer("x"),
    y: integer("y"),
    w: integer("w"),
    h: integer("h"),
    z: integer("z"),
  },
  (t) => [primaryKey({ columns: [t.boardId, t.itemId] })],
);

export const tags = sqliteTable(
  "tags",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
  },
  (t) => [uniqueIndex("tags_user_name_idx").on(t.userId, t.name)],
);

export const itemTags = sqliteTable(
  "item_tags",
  {
    itemId: text("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.itemId, t.tagId] })],
);

export type Item = typeof items.$inferSelect;
