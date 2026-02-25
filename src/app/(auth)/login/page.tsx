import { Suspense } from "react";
import { LoginForm } from "@/components/organisms/login-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
