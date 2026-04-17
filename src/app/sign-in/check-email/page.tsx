export default function CheckEmailPage() {
  return (
    <main className="mx-auto max-w-sm px-6 py-24 text-center">
      <h1 className="text-3xl font-bold tracking-tight">Check your email</h1>
      <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-300">
        We just sent a sign-in link. Click it from the same browser to finish
        signing in.
      </p>
      <p className="mt-10 text-xs text-neutral-500">
        Don&apos;t see the email? Check your spam folder, or ask the pool admin
        to confirm your address is on the allow-list.
      </p>
    </main>
  );
}
