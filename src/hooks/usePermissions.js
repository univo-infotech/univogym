import { useAuth } from "../contexts/AuthContext";

export function usePermissions(moduleId) {
  const { role, permissions } = useAuth();
  
  if (role === "owner") {
    return { view: true, create: true, edit: true, delete: true };
  }
  
  // Backward compatibility for array-based permissions
  if (Array.isArray(permissions)) {
    const hasView = permissions.includes(moduleId);
    return { view: hasView, create: hasView, edit: hasView, delete: hasView };
  }

  const modPerms = permissions?.[moduleId] || {};
  return {
    view: !!modPerms.view,
    create: !!modPerms.create,
    edit: !!modPerms.edit,
    delete: !!modPerms.delete,
  };
}
