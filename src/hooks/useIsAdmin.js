import { useAuth } from "../context/AuthContext";

// The signed-in user is an ADMIN
export const useIsAdmin = () => {
  const { user } = useAuth();
  return user?.role === "ADMIN";
};
