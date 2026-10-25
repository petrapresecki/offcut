import { getBucket } from "@/db";
import { sharedKeyAllowed } from "@/lib/share";

// Images on a shared board, for people without an account. Only keys of items on that board.
export async function GET(req: Request, { params }: { params: Promise<{ token: string; key: string[] }> }) {
  const { token, key: parts } = await params;
  const key = parts.join("/");
  if (!(await sharedKeyAllowed(token, key))) return new Response("Not found", { status: 404 });

  const object = await (await getBucket()).get(key, { onlyIf: req.headers });
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  // Short cache: revoking the link should stop the images loading soon after.
  headers.set("cache-control", "private, max-age=300");
  headers.set("x-robots-tag", "noindex");
  if (!("body" in object)) return new Response(null, { status: 304, headers });
  return new Response(object.body, { headers });
}
