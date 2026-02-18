import { createContext, useContext, useState, type ReactNode } from "react";

export type Environment = "sandbox" | "production";

interface EnvironmentContextType {
  environment: Environment;
  setEnvironment: (env: Environment) => void;
}

const EnvironmentContext = createContext<EnvironmentContextType | undefined>(undefined);

const STORAGE_KEY = "xyno_environment";

export function EnvironmentProvider({ children }: { children: ReactNode }) {
  const [environment, setEnvironmentState] = useState<Environment>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "production" ? "production" : "sandbox";
  });

  const setEnvironment = (env: Environment) => {
    localStorage.setItem(STORAGE_KEY, env);
    setEnvironmentState(env);
  };

  return (
    <EnvironmentContext.Provider value={{ environment, setEnvironment }}>
      {children}
    </EnvironmentContext.Provider>
  );
}

export function useEnvironment() {
  const context = useContext(EnvironmentContext);
  if (context === undefined) {
    throw new Error("useEnvironment must be used within an EnvironmentProvider");
  }
  return context;
}
