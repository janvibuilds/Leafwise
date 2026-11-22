"use client";

import { createContext, useContext } from "react";

export type AppUser = {
  name: string;
  email: string;
};

type AppContextValue = {
  user: AppUser;
  signOut: () => Promise<void>;
};

export const AppContext = createContext<AppContextValue | null>(null);

export function useAppUser(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error("useAppUser must be used inside AppContext");
  return value;
}
