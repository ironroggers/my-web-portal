import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import blockProfileService from "../services/blockProfileService.jsx";

// One request per role per page load; the matrix lives on the server
const cache = new Map();

const loadPermissions = (role) => {
  if (!cache.has(role)) {
    const request = blockProfileService.permissions(role).catch((error) => {
      cache.delete(role);
      throw error;
    });
    cache.set(role, request);
  }
  return cache.get(role);
};

/**
 * Block profile permissions for the signed-in user, from the execution service's
 * matrix (src/config/permissions.js there). `can(action, record)` checks "own"-scoped
 * actions against the record's createdBy. Nothing is allowed until the matrix loads.
 */
export const useBlockPermissions = () => {
  const { user } = useAuth();
  const role = user?.role;
  const userId = user?._id || user?.id;
  const [loaded, setLoaded] = useState({ role: null, actions: null, error: "" });

  useEffect(() => {
    if (!role) return undefined;
    let active = true;
    loadPermissions(role)
      .then((actions) => active && setLoaded({ role, actions, error: "" }))
      .catch((error) => active && setLoaded({ role, actions: null, error: error.message || "Failed to load permissions" }));
    return () => {
      active = false;
    };
  }, [role]);

  const current = loaded.role === role ? loaded : { actions: null, error: "" };

  const can = (action, record) => {
    const permission = current.actions?.[action];
    if (!permission?.allowed) return false;
    if (permission.scope === "own") {
      return Boolean(record && userId && String(record.createdBy) === String(userId));
    }
    return true;
  };

  return {
    can,
    userId,
    loading: Boolean(role) && !current.actions && !current.error,
    error: current.error,
  };
};
