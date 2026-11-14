import { Redirect } from "expo-router";
import { useAuth } from "../../../../hooks/useAuth";
import { BundleForm } from "../../../../components/BundleForm";

export default function NewBundle() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Redirect href="/(tabs)/exercises" />;
  return <BundleForm />;
}
