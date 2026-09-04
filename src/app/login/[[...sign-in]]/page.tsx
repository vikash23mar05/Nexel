import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#111111] p-6">
      <SignIn routing="path" path="/login" signUpUrl="/signup" fallbackRedirectUrl="/storage" />
    </main>
  );
}
