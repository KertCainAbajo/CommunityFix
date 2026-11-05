import type { Metadata } from "next";
import Link from "next/link";

import { ForgotPasswordForm } from "@/components/forms";

export const metadata: Metadata = { title: "Forgot your password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-center text-2xl">Forgot your password?</h1>
      <p className="text-center text-muted-foreground">Enter your email and we&apos;ll send you a link to choose a new one.</p>
      <ForgotPasswordForm />
      <p className="text-center text-sm">
        <Link href="/staff/login" className="link">Back to staff login</Link>
      </p>
    </>
  );
}
