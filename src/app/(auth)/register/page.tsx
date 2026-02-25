import { redirect } from "next/navigation";
import { isRegistrationOpen } from "@/lib/auth/registration-mode";
import { RegisterForm } from "@/components/organisms/register-form";

export default async function RegisterPage() {
  const open = await isRegistrationOpen();
  if (!open) {
    redirect("/login");
  }
  return <RegisterForm />;
}
