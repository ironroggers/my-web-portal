import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import executionService from "../services/executionService.jsx";

// One request per role per page load; the matrix lives on the server
const cache = new Map();

const loadPermissions = (role) => {
  if (!cache.has(role)) {
    const request = executionService
      .getPermissions(role)
      .then((data) => data.actions)
      .catch((error) => {
        cache.delete(role);
        throw error;
      });
    cache.set(role, request);
  }
  return cache.get(role);
};

/**
 * Permissions for the signed-in user from the execution service's matrix
 * (execution-service/src/config/permissions.js): block profiles and OFC execution.
 * `can(action, record)` checks "own"-scoped actions against the record's creator.
 * Nothing is allowed until the matrix loads.
 */
export const usePermissions = () => {
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
      const creator = record?.createdBy?.id || record?.createdBy;
      return Boolean(record && userId && String(creator) === String(userId));
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
