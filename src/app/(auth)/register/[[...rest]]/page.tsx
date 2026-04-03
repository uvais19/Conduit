import { SignUp } from "@clerk/nextjs";

export default function RegisterPage() {
  return (
    <div className="w-full max-w-sm">
      <SignUp
        path="/register"
        routing="path"
        signInUrl="/login"
        fallbackRedirectUrl="/onboarding"
      />
    </div>
  );
}
