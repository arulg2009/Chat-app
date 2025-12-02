"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Camera, Save, User, Mail, MapPin, Globe, Phone, Calendar,
  Briefcase, Heart, FileText, Shield, Bell, Palette, Lock, Trash2,
  Download, Eye, EyeOff, Loader2, Check, X, AlertTriangle, Circle, Moon, Sun, Monitor,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

interface ProfileData {
  id: string; name: string | null; realName: string | null; email: string | null;
  image: string | null; bio: string | null; hobbies: string | null; location: string | null;
  website: string | null; phone: string | null; dateOfBirth: string | null;
  gender: string | null; occupation: string | null; status: string; createdAt: string;
}

const STATUS_OPTIONS = [
  { value: "online", label: "Online", color: "bg-green-500" },
  { value: "away", label: "Away", color: "bg-yellow-500" },
  { value: "busy", label: "Busy", color: "bg-red-500" },
  { value: "invisible", label: "Invisible", color: "bg-gray-400" },
];

export default function ProfilePage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "privacy" | "notifications" | "appearance">("profile");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [formData, setFormData] = useState({ name: "", realName: "", bio: "", hobbies: "", location: "", website: "", phone: "", dateOfBirth: "", gender: "", occupation: "" });
  const [showEmail, setShowEmail] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [showLastSeen, setShowLastSeen] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [messagePreview, setMessagePreview] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [currentStatus, setCurrentStatus] = useState("online");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordError, setPasswordError] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (status === "unauthenticated") router.push("/auth/signin"); }, [status, router]);
  useEffect(() => { if (status === "authenticated") fetchProfile(); }, [status]);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setAvatarUrl(data.image);
        setCurrentStatus(data.status || "online");
        setFormData({ name: data.name || "", realName: data.realName || "", bio: data.bio || "", hobbies: data.hobbies || "", location: data.location || "", website: data.website || "", phone: data.phone || "", dateOfBirth: data.dateOfBirth ? data.dateOfBirth.split("T")[0] : "", gender: data.gender || "", occupation: data.occupation || "" });
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
      if (res.ok) { 
        setProfile(await res.json()); 
        // Update session if name changed
        await updateSession();
        setSuccessMessage("Saved!"); 
        setTimeout(() => setSuccessMessage(""), 2000); 
      }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleExportData = async () => {
    try {
      const res = await fetch("/api/profile/export");
      if (res.ok) { const blob = await res.blob(); const url = window.URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "my-data.json"; a.click(); }
    } catch (e) { console.error(e); }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) return;
    setUploadingAvatar(true);
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("type", "avatar");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) {
        const { url } = await res.json();
        const updateRes = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: url }) });
        if (updateRes.ok) { 
          setAvatarUrl(url); 
          // Update the session to persist the new avatar across the app
          await updateSession();
          setSuccessMessage("Avatar updated!"); 
          setTimeout(() => setSuccessMessage(""), 2000); 
        }
      }
    } catch (e) { console.error(e); }
    finally { setUploadingAvatar(false); }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch("/api/profile/status", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
      if (res.ok) { setCurrentStatus(newStatus); setProfile(prev => prev ? { ...prev, status: newStatus } : prev); setShowStatusDropdown(false); }
    } catch (e) { console.error(e); }
  };

  const handlePasswordChange = async () => {
    setPasswordError("");
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) { setPasswordError("All fields required"); return; }
    if (passwordData.newPassword.length < 8) { setPasswordError("Min 8 characters"); return; }
    if (passwordData.newPassword !== passwordData.confirmPassword) { setPasswordError("Passwords don't match"); return; }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword }) });
      if (res.ok) { setShowPasswordModal(false); setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" }); setSuccessMessage("Password changed!"); setTimeout(() => setSuccessMessage(""), 2000); }
      else { const err = await res.json(); setPasswordError(err.error || "Failed"); }
    } catch (e) { setPasswordError("Error occurred"); }
    finally { setSavingPassword(false); }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;
    try { const res = await fetch("/api/profile", { method: "DELETE" }); if (res.ok) await signOut({ callbackUrl: "/" }); } catch (e) { console.error(e); }
  };

  const applyTheme = (t: "light" | "dark" | "system") => {
    setTheme(t);
    if (t === "dark") document.documentElement.classList.add("dark");
    else if (t === "light") document.documentElement.classList.remove("dark");
    else { if (window.matchMedia("(prefers-color-scheme: dark)").matches) document.documentElement.classList.add("dark"); else document.documentElement.classList.remove("dark"); }
  };

  const getInitials = (name: string | null) => name ? name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "U";

  if (status === "loading" || loading) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  if (!session) return null;

  return (
    <div className="min-h-screen bg-background">
      {successMessage && (
        <div className="fixed top-3 right-3 z-50 animate-slideDown">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white text-xs rounded-md shadow-soft"><Check className="w-3.5 h-3.5" />{successMessage}</div>
        </div>
      )}

      {/* Header */}
      <header className="h-14 sm:h-12 px-3 sm:px-4 flex items-center gap-3 border-b bg-card sticky top-0 z-10 safe-area-top">
        <button onClick={() => router.push("/dashboard")} className="p-2.5 sm:p-1.5 hover:bg-muted active:bg-muted/80 rounded-md touch-manipulation"><ArrowLeft className="w-5 h-5 sm:w-4 sm:h-4" /></button>
        <h1 className="text-base sm:text-sm font-semibold">Settings</h1>
      </header>

      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4">
        {/* Profile Card */}
        <div className="bg-card rounded-xl p-4 mb-4 shadow-soft">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="w-18 h-18 sm:w-16 sm:h-16 border-2 border-background shadow-soft">
                <AvatarImage src={avatarUrl || session.user?.image || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xl sm:text-lg">{getInitials(profile?.name || session.user?.name || null)}</AvatarFallback>
              </Avatar>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar} className="absolute -bottom-1 -right-1 p-2 sm:p-1.5 bg-primary rounded-full text-primary-foreground hover:opacity-90 shadow-soft disabled:opacity-50 touch-manipulation">
                {uploadingAvatar ? <Loader2 className="w-4 h-4 sm:w-3 sm:h-3 animate-spin" /> : <Camera className="w-4 h-4 sm:w-3 sm:h-3" />}
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-base font-semibold truncate">{profile?.name || "User"}</h2>
              <p className="text-sm sm:text-xs text-muted-foreground truncate">{profile?.email}</p>
              <div className="flex items-center gap-2 mt-2 sm:mt-1.5">
                <div className="relative">
                  <button onClick={() => setShowStatusDropdown(!showStatusDropdown)} className="flex items-center gap-1.5 px-3 py-1 sm:px-2 sm:py-0.5 rounded-full bg-muted/50 hover:bg-muted active:bg-muted/80 text-sm sm:text-xs touch-manipulation">
                    <Circle className={`w-2.5 h-2.5 sm:w-2 sm:h-2 ${STATUS_OPTIONS.find(s => s.value === currentStatus)?.color} rounded-full`} />
                    <span className="capitalize">{currentStatus}</span>
                  </button>
                  {showStatusDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-32 bg-card rounded-md shadow-soft-lg border overflow-hidden z-20 animate-scaleIn">
                      {STATUS_OPTIONS.map(s => (
                        <button key={s.value} onClick={() => handleStatusChange(s.value)} className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted ${currentStatus === s.value ? "bg-primary/5" : ""}`}>
                          <Circle className={`w-2 h-2 ${s.color} rounded-full`} />{s.label}
                          {currentStatus === s.value && <Check className="w-3 h-3 text-primary ml-auto" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {profile?.occupation && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{profile.occupation}</Badge>}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 sm:gap-1 mb-4 overflow-x-auto scrollbar-none pb-1 -mx-3 px-3 sm:mx-0 sm:px-0">
          {[{ id: "profile", icon: User, label: "Profile" }, { id: "privacy", icon: Shield, label: "Privacy" }, { id: "notifications", icon: Bell, label: "Alerts" }, { id: "appearance", icon: Palette, label: "Theme" }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)} className={`flex items-center gap-1.5 px-4 py-2.5 sm:px-3 sm:py-1.5 rounded-md text-sm sm:text-xs font-medium whitespace-nowrap transition-colors touch-manipulation ${activeTab === tab.id ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted active:bg-muted/80"}`}>
              <tab.icon className="w-4 h-4 sm:w-3.5 sm:h-3.5" />{tab.label}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="bg-card rounded-xl p-4 shadow-soft space-y-4">
            <h3 className="text-sm sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">Personal Info</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-3">
              {[
                { icon: User, label: "Display Name", key: "name", placeholder: "Your name" },
                { icon: User, label: "Real Name", key: "realName", placeholder: "Full name" },
                { icon: Briefcase, label: "Occupation", key: "occupation", placeholder: "Job title" },
                { icon: MapPin, label: "Location", key: "location", placeholder: "City, Country" },
                { icon: Globe, label: "Website", key: "website", placeholder: "https://..." },
                { icon: Phone, label: "Phone", key: "phone", placeholder: "+1 234..." },
              ].map(field => (
                <div key={field.key}>
                  <label className="flex items-center gap-1 text-xs sm:text-[10px] font-medium text-muted-foreground mb-1.5 sm:mb-1"><field.icon className="w-3.5 h-3.5 sm:w-3 sm:h-3" />{field.label}</label>
                  <Input value={formData[field.key as keyof typeof formData]} onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })} placeholder={field.placeholder} className="h-11 sm:h-8 text-base sm:text-xs" />
                </div>
              ))}
              <div>
                <label className="flex items-center gap-1 text-xs sm:text-[10px] font-medium text-muted-foreground mb-1.5 sm:mb-1"><Calendar className="w-3.5 h-3.5 sm:w-3 sm:h-3" />Birthday</label>
                <Input type="date" value={formData.dateOfBirth} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} className="h-11 sm:h-8 text-base sm:text-xs" />
              </div>
              <div>
                <label className="text-xs sm:text-[10px] font-medium text-muted-foreground mb-1.5 sm:mb-1 block">Gender</label>
                <select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} className="w-full h-11 sm:h-8 px-3 sm:px-2 text-base sm:text-xs bg-background border rounded-md">
                  <option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                </select>
              </div>
            </div>
            <div>
              <label className="flex items-center gap-1 text-xs sm:text-[10px] font-medium text-muted-foreground mb-1.5 sm:mb-1"><FileText className="w-3.5 h-3.5 sm:w-3 sm:h-3" />Bio</label>
              <textarea value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} placeholder="About you..." className="w-full px-3 py-2.5 sm:py-2 text-base sm:text-xs bg-background border rounded-md resize-none h-24 sm:h-16" maxLength={200} />
              <p className="text-xs sm:text-[9px] text-muted-foreground mt-1 sm:mt-0.5">{formData.bio.length}/200</p>
            </div>
            <div>
              <label className="flex items-center gap-1 text-xs sm:text-[10px] font-medium text-muted-foreground mb-1.5 sm:mb-1"><Heart className="w-3.5 h-3.5 sm:w-3 sm:h-3" />Interests</label>
              <Input value={formData.hobbies} onChange={(e) => setFormData({ ...formData, hobbies: e.target.value })} placeholder="Reading, Music..." className="h-11 sm:h-8 text-base sm:text-xs" />
            </div>
            <Button onClick={handleSaveProfile} disabled={saving} size="sm" className="gradient-primary text-sm sm:text-xs h-11 sm:h-8 w-full sm:w-auto touch-manipulation">
              <Save className="w-4 h-4 sm:w-3 sm:h-3 mr-1.5" />{saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}

        {/* Privacy Tab */}
        {activeTab === "privacy" && (
          <div className="bg-card rounded-xl p-4 shadow-soft space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Visibility</h3>
            {[
              { icon: Mail, label: "Show Email", desc: "Let others see your email", state: showEmail, setState: setShowEmail },
              { icon: Eye, label: "Online Status", desc: "Show when online", state: showOnlineStatus, setState: setShowOnlineStatus },
              { icon: EyeOff, label: "Last Seen", desc: "Show last active", state: showLastSeen, setState: setShowLastSeen },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2.5"><item.icon className="w-4 h-4 text-muted-foreground" /><div><p className="text-xs font-medium">{item.label}</p><p className="text-[10px] text-muted-foreground">{item.desc}</p></div></div>
                <Switch checked={item.state} onCheckedChange={item.setState} />
              </div>
            ))}
            <div className="border-t pt-3 mt-3 space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Security</h4>
              <button onClick={handleExportData} className="w-full flex items-center gap-2.5 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                <Download className="w-4 h-4 text-blue-500" /><div className="text-left"><p className="text-xs font-medium">Export Data</p><p className="text-[10px] text-muted-foreground">Download your data</p></div>
              </button>
              <button onClick={() => setShowPasswordModal(true)} className="w-full flex items-center gap-2.5 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                <Lock className="w-4 h-4 text-amber-500" /><div className="text-left"><p className="text-xs font-medium">Change Password</p><p className="text-[10px] text-muted-foreground">Update password</p></div>
              </button>
              <button onClick={() => setShowDeleteModal(true)} className="w-full flex items-center gap-2.5 p-3 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-colors">
                <Trash2 className="w-4 h-4 text-red-500" /><div className="text-left"><p className="text-xs font-medium text-red-600">Delete Account</p><p className="text-[10px] text-red-400">Permanently delete</p></div>
              </button>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <div className="bg-card rounded-xl p-4 shadow-soft space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Preferences</h3>
            {[
              { icon: Mail, label: "Email", desc: "Important updates", state: emailNotifications, setState: setEmailNotifications },
              { icon: Bell, label: "Push", desc: "New messages", state: pushNotifications, setState: setPushNotifications },
              { icon: Eye, label: "Previews", desc: "Show content", state: messagePreview, setState: setMessagePreview },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2.5"><item.icon className="w-4 h-4 text-muted-foreground" /><div><p className="text-xs font-medium">{item.label}</p><p className="text-[10px] text-muted-foreground">{item.desc}</p></div></div>
                <Switch checked={item.state} onCheckedChange={item.setState} />
              </div>
            ))}
          </div>
        )}

        {/* Appearance Tab */}
        {activeTab === "appearance" && (
          <div className="bg-card rounded-xl p-4 shadow-soft space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Theme</h3>
            <div className="grid grid-cols-3 gap-2">
              {[{ id: "light", label: "Light", icon: Sun }, { id: "dark", label: "Dark", icon: Moon }, { id: "system", label: "Auto", icon: Monitor }].map(t => (
                <button key={t.id} onClick={() => applyTheme(t.id as typeof theme)} className={`p-3 rounded-lg border text-center transition-colors ${theme === t.id ? "border-primary bg-primary/5" : "border-transparent bg-muted/30 hover:bg-muted/50"}`}>
                  <t.icon className={`w-5 h-5 mx-auto mb-1 ${theme === t.id ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-xs font-medium">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-[10px] text-muted-foreground mt-4">Member since {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "..."}</p>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-card rounded-lg p-4 max-w-xs w-full shadow-soft-lg animate-scaleIn">
            <div className="flex items-center gap-2 mb-3"><div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-full"><Lock className="w-4 h-4 text-amber-600" /></div><h3 className="text-sm font-semibold">Change Password</h3></div>
            {passwordError && <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-red-600 text-xs">{passwordError}</div>}
            <div className="space-y-2">
              <Input type="password" value={passwordData.currentPassword} onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })} placeholder="Current password" className="h-8 text-xs" />
              <Input type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} placeholder="New password" className="h-8 text-xs" />
              <Input type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} placeholder="Confirm password" className="h-8 text-xs" />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setShowPasswordModal(false); setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" }); setPasswordError(""); }} className="flex-1 py-1.5 text-xs border rounded hover:bg-muted">Cancel</button>
              <button onClick={handlePasswordChange} disabled={savingPassword} className="flex-1 py-1.5 text-xs bg-primary text-primary-foreground rounded disabled:opacity-50 flex items-center justify-center gap-1">{savingPassword && <Loader2 className="w-3 h-3 animate-spin" />}{savingPassword ? "Saving" : "Save"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-card rounded-lg p-4 max-w-xs w-full shadow-soft-lg animate-scaleIn">
            <div className="flex items-center gap-2 mb-3"><div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-full"><AlertTriangle className="w-4 h-4 text-red-600" /></div><h3 className="text-sm font-semibold text-red-600">Delete Account</h3></div>
            <p className="text-xs text-muted-foreground mb-3">This cannot be undone. All data will be permanently deleted.</p>
            <div className="mb-3"><label className="text-[10px] font-medium mb-1 block">Type <span className="font-bold text-red-600">DELETE</span> to confirm</label><Input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="DELETE" className="h-8 text-xs border-red-300 focus:border-red-500" /></div>
            <div className="flex gap-2">
              <button onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(""); }} className="flex-1 py-1.5 text-xs border rounded hover:bg-muted">Cancel</button>
              <button onClick={handleDeleteAccount} disabled={deleteConfirmText !== "DELETE"} className="flex-1 py-1.5 text-xs bg-red-600 text-white rounded disabled:opacity-50">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
