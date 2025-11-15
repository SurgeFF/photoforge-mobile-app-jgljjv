
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ACCESS_KEY_STORAGE = "@photoforge_access_key";

interface AuthContextType {
  accessKey: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (key: string) => Promise<void>;
  logout: () => Promise<void>;
  validateKey: (key: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessKey, setAccessKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredKey();
  }, []);

  const loadStoredKey = async () => {
    try {
      const storedKey = await AsyncStorage.getItem(ACCESS_KEY_STORAGE);
      if (storedKey) {
        setAccessKey(storedKey);
      }
    } catch (error) {
      console.error("Error loading access key:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const validateKey = async (key: string): Promise<boolean> => {
    try {
      const response = await fetch("https://photoforge.base44.app/api/validate-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accessKey: key }),
      });

      const data = await response.json();
      return response.ok && data.isValid;
    } catch (error) {
      console.error("Validation error:", error);
      return false;
    }
  };

  const login = async (key: string) => {
    await AsyncStorage.setItem(ACCESS_KEY_STORAGE, key);
    setAccessKey(key);
  };

  const logout = async () => {
    await AsyncStorage.removeItem(ACCESS_KEY_STORAGE);
    setAccessKey(null);
  };

  return (
    <AuthContext.Provider
      value={{
        accessKey,
        isAuthenticated: !!accessKey,
        isLoading,
        login,
        logout,
        validateKey,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
