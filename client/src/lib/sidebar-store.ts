import { useState, useEffect } from "react";

let globalSidebarOpen = false;
const listeners = new Set<(open: boolean) => void>();

export function useSidebar() {
  const [open, setOpen] = useState(globalSidebarOpen);

  useEffect(() => {
    const handler = (state: boolean) => setOpen(state);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  const toggleSidebar = () => {
    globalSidebarOpen = !globalSidebarOpen;
    listeners.forEach((fn) => fn(globalSidebarOpen));
  };

  const setSidebarOpen = (state: boolean) => {
    globalSidebarOpen = state;
    listeners.forEach((fn) => fn(globalSidebarOpen));
  };

  return { open, toggleSidebar, setSidebarOpen };
}
