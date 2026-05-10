import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import Upload from "./pages/Upload";
import Settings from "./pages/Settings";
import Navbar from "./components/Navbar";
import { auth, logout } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function App() {
  const [user, setUser] = useState<{ email: string; role: string; uid: string; displayName?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser && firebaseUser.email) {
        const email = firebaseUser.email.toLowerCase().trim();
        const userRole = (email === "bsrat391@gmail.com" || email === "bisratfrawlegesee@gmail.com") ? "admin" : "guest";
        setUser({
          email: firebaseUser.email,
          uid: firebaseUser.uid,
          role: userRole,
          displayName: firebaseUser.displayName || undefined
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex flex-col items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <BrowserRouter>
      <div className="flex w-full h-[100dvh] overflow-hidden bg-background text-foreground selection:bg-primary/30 relative">
        <Navbar user={user} onLogout={handleLogout} />
        <main className="flex-1 overflow-hidden relative">
          <Routes>
            <Route path="/" element={<Dashboard user={user} />} />
            <Route path="/chat" element={<Chat user={user} />} />
            <Route path="/upload" element={<Upload user={user} />} />
            <Route path="/settings" element={<Settings user={user} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

