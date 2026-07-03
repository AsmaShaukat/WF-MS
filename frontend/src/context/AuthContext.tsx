import React, { createContext, useContext, useState,useEffect } from "react";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthContextType = {
    user: any;
    userData: any;
    token: string | null;
    login: (userData: AuthContextType) => void;
    logout:() => void;
};

export const AuthProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
    const [user, setUser] = useState<AuthContextType | null>(null);
    const [token, setToken] = useState<string | null>(null);
    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        const storedToken = localStorage.getItem("token");
        
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        if (storedToken) {
            setToken(storedToken);
        }
     
    }, []); 
    
    const login = (userData: AuthContextType) => {
        setUser(userData.user);
        setToken(userData.user.token);
        
        localStorage.setItem("user", JSON.stringify(userData.user));
        localStorage.setItem("token", userData.user.token || "");
        // Implement login logic here
    };
    const logout = () => {
        setUser(null);
        setToken(null);
        
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        // Implement logout logic here
    };
    

    return (
        <AuthContext.Provider value={{ user, userData:user, token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};