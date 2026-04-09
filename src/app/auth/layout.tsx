import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In or Create Account",
  description:
    "Sign in to ClipMeta or create a free account. Start generating AI metadata for your stock footage clips — no credit card required.",
  robots: { index: false, follow: false },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
