import { Redirect } from "expo-router";
import { useAuth } from "../../../hooks/useAuth";
import { ProgramForm } from "../../../components/ProgramForm";

export default function NewProgram() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Redirect href="/(tabs)/programs" />;
  return <ProgramForm />;
}
