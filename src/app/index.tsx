import { Redirect } from "expo-router";
import { useAuth } from "../hooks/useAuth";

export default function Index() {
  const { isAuthenticated } = useAuth();
  return <Redirect href={isAuthenticated ? "/(tabs)/dashboard" : "/login"} />;
}
