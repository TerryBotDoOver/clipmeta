import { redirect } from "next/navigation";

type SignUpPageProps = {
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = new URLSearchParams();
  params.set("mode", "signup");

  const incoming = (await searchParams) ?? {};
  for (const [key, value] of Object.entries(incoming)) {
    if (key === "mode") continue;
    const first = Array.isArray(value) ? value[0] : value;
    if (first) params.set(key, first);
  }

  redirect(`/auth?${params.toString()}`);
}
