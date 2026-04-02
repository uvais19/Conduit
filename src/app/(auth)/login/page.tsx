import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      <SignIn
        path="/login"
        routing="path"
        signUpUrl="/register"
        fallbackRedirectUrl="/dashboard"
      />
    </div>
  );
}
