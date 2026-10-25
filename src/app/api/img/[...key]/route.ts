import { getBucket } from "@/db";
import { getUser } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const user = await getUser();
  const key = (await params).key.join("/");
  // Keys start with the owner's id; shared boards will get their own route.
  if (!user || !key.startsWith(`${user.id}/`)) return new Response("Not found", { status: 404 });

  const object = await (await getBucket()).get(key, { onlyIf: req.headers });
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  // Objects never change once written, so the browser can keep them.
  headers.set("cache-control", "private, max-age=31536000, immutable");
  if (!("body" in object)) return new Response(null, { status: 304, headers });
  return new Response(object.body, { headers });
}
