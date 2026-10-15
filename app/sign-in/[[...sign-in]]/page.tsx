import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="text-center">
        <h1 className="mb-1 text-lg font-bold text-ink">ChatCoat Admin</h1>
        <p className="mb-6 text-sm text-muted">Staff sign-in</p>
        <SignIn
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-[var(--surface)] shadow-card dark:border dark:border-white/[0.06]",
            },
          }}
        />
      </div>
    </div>
  );
}
