import { usePermissions } from "./usePermissions";

// Kept for the block-profile pages; the general hook covers every action now
export const useBlockPermissions = () => usePermissions();
