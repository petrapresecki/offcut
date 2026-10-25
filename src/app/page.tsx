import { getUser } from "@/lib/auth";
import { Landing } from "@/components/landing/Landing";

export default async function Home() {
  const user = await getUser();
  return <Landing signedIn={!!user} />;
}
