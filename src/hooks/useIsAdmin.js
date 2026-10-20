import { useAuth } from "../context/AuthContext";

// The signed-in user is an ADMIN (e.g. the demo block's controls)
export const useIsAdmin = () => {
  const { user } = useAuth();
  return user?.role === "ADMIN";
};
