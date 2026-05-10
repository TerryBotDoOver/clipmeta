import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const termsVersion = searchParams.get("terms");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // If there's an error from the OAuth provider
  if (error) {
    console.error("OAuth error:", error, errorDescription);
    return NextResponse.redirect(
      `${origin}/auth?error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  if (code) {
    const redirectUrl = `${origin}${next}`;
    const response = NextResponse.redirect(redirectUrl);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (!exchangeError) {
      if (termsVersion) {
        const acceptedAt = new Date().toISOString();
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            terms_accepted_at: acceptedAt,
            terms_version: termsVersion,
            privacy_version: termsVersion,
          },
        });
        if (updateError) {
          console.error("Terms metadata update error:", updateError.message);
        }
      }
      return response;
    }
    console.error("Code exchange error:", exchangeError.message);
  }

  // No code received — redirect to dashboard anyway in case session was set via implicit flow
  return NextResponse.redirect(`${origin}/auth?error=Authentication+failed.+Please+try+again.`);
}
