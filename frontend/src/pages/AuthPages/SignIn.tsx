import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="ISMO | Sign In"
        description="Sign in to your ISMO account to access the dashboard and manage your attendance."
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
