import { SignUp } from "@clerk/nextjs";

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#111111] p-6">
      <SignUp routing="path" path="/signup" signInUrl="/login" fallbackRedirectUrl="/storage" />
    </main>
  );
}
