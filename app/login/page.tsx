import Image from "next/image";
import { signInWithGoogle } from "@/app/actions/auth";
import logo from "@/public/logo.png";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="auth-canvas">
      <div className="w-full max-w-md rounded-[14px] border border-line bg-card px-8 py-10 shadow-[0_1px_2px_rgba(18,26,23,0.04),0_12px_32px_rgba(18,26,23,0.06)]">
        <div className="mb-4">
          <Image
            src={logo}
            alt="Resumate"
            priority
            className="h-8 w-auto"
          />
        </div>
        <h1 className="font-serif text-4xl font-medium tracking-tight text-ink">
          Sign in to continue
        </h1>
        <p className="mt-3 text-[15px] text-muted">
          Google is the only way in. We’ll use your account to keep your résumé
          and matches private to you.
        </p>
        {error ? (
          <p className="mt-5 text-sm text-danger">
            Sign-in didn’t complete. Try Google again.
          </p>
        ) : null}
        <form action={signInWithGoogle} className="mt-8">
          <button
            type="submit"
            className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-[10px] bg-forest px-4 py-3 text-sm font-semibold tracking-tight text-paper transition-[transform,background-color] duration-150 ease-out hover:bg-forest-bright active:translate-y-px active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:translate-y-0 motion-reduce:active:scale-100"
          >
            <GoogleMark />
            Continue with Google
          </button>
        </form>
      </div>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#fff"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#fff"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#fff"
        d="M3.97 10.71A5.41 5.41 0 0 1 3.69 9c0-.6.1-1.17.26-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3.01-2.33Z"
      />
      <path
        fill="#fff"
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.87 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
