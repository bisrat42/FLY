import React, { useState } from "react";
import { User, Shield, CheckCircle } from "lucide-react";
import { updateProfile } from "firebase/auth";
import { auth } from "../firebase";

interface SettingsProps {
  user: any;
}

export default function Settings({ user }: SettingsProps) {
  const [displayName, setDisplayName] = useState(user.displayName || "");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      await updateProfile(auth.currentUser, {
        displayName: displayName.trim()
      });
      setSuccess(true);
      // Wait a moment then reload to apply changes everywhere (navbar etc)
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto flex flex-col h-full overflow-y-auto pb-24 md:pb-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" /> Admin Settings
        </h1>
        <p className="text-muted-foreground">Manage your profile and application settings.</p>
      </div>

      <div className="space-y-6">
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" /> Profile Settings
          </h2>
          {error && <div className="p-3 mb-4 text-sm text-destructive bg-destructive/10 rounded-lg">{error}</div>}
          {success && (
            <div className="p-3 mb-4 text-sm text-green-500 bg-green-500/10 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Profile updated successfully! Reloading...
            </div>
          )}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email Address</label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full bg-secondary text-muted-foreground border border-border rounded-md px-3 py-2 text-sm cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
