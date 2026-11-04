import type { Metadata } from "next";
import Link from "next/link";

import { ForgotPasswordForm } from "@/components/forms";

export const metadata: Metadata = { title: "Forgot your password" };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto grid w-full max-w-sm gap-3.5">
      <h1 className="text-3xl font-bold tracking-tight">Forgot your password?</h1>
      <p className="text-muted-foreground">Enter your email and we&apos;ll send you a link to choose a new one.</p>
      <ForgotPasswordForm />
      <p className="text-sm">
        <Link href="/login" className="text-primary underline">Back to log in</Link>
      </p>
    </div>
  );
}
