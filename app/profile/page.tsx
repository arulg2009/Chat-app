"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Camera,
  Save,
  User,
  Mail,
  MapPin,
  Globe,
  Phone,
  Calendar,
  Briefcase,
  Heart,
  FileText,
  Shield,
  Bell,
  Palette,
  Lock,
  Trash2,
  Download,
  Eye,
  EyeOff,
  Loader2,
  Upload,
  Check,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

interface ProfileData {
  id: string;
  name: string | null;
  realName: string | null;
  email: string | null;
  image: string | null;
  bio: string | null;
  hobbies: string | null;
  location: string | null;
  website: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  occupation: string | null;
  status: string;
  createdAt: string;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "privacy" | "notifications" | "appearance">("profile");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    realName: "",
    bio: "",
    hobbies: "",
    location: "",
    website: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    occupation: "",
  });
  const [showEmail, setShowEmail] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [showLastSeen, setShowLastSeen] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [messagePreview, setMessagePreview] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchProfile();
    }
  }, [status]);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setAvatarUrl(data.image);
        setFormData({
          name: data.name || "",
          realName: data.realName || "",
          bio: data.bio || "",
          hobbies: data.hobbies || "",
          location: data.location || "",
          website: data.website || "",
          phone: data.phone || "",
          dateOfBirth: data.dateOfBirth ? data.dateOfBirth.split("T")[0] : "",
          gender: data.gender || "",
          occupation: data.occupation || "",
        });
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
        alert("Profile updated successfully!");
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update profile");
      }
    } catch (err) {
      console.error("Error saving profile:", err);
      alert("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      const res = await fetch("/api/profile/export");
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "my-chat-data.json";
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Error exporting data:", err);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
      return;
    }

    setUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "avatar");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || "Upload failed");
      }

      const { url } = await uploadRes.json();

      // Update profile with new avatar
      const updateRes = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: url }),
      });

      if (updateRes.ok) {
        setAvatarUrl(url);
        alert("Avatar updated successfully!");
      }
    } catch (err) {
      console.error("Avatar upload error:", err);
      alert(err instanceof Error ? err.message : "Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold">Settings</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Profile Header Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative">
              <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
                <AvatarImage src={avatarUrl || session.user?.image || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-2xl">
                  {getInitials(profile?.name || session.user?.name || null)}
                </AvatarFallback>
              </Avatar>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 p-2 bg-blue-600 rounded-full text-white hover:bg-blue-700 shadow-lg disabled:opacity-50"
              >
                {uploadingAvatar ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="text-center md:text-left flex-1">
              <h2 className="text-2xl font-bold">{profile?.name || "User"}</h2>
              <p className="text-gray-500">{profile?.email}</p>
              <div className="flex flex-wrap gap-2 mt-2 justify-center md:justify-start">
                <Badge variant="success">
                  {profile?.status === "online" ? "Online" : "Offline"}
                </Badge>
                {profile?.occupation && (
                  <Badge variant="secondary">{profile.occupation}</Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: "profile", icon: User, label: "Profile" },
            { id: "privacy", icon: Shield, label: "Privacy" },
            { id: "notifications", icon: Bell, label: "Notifications" },
            { id: "appearance", icon: Palette, label: "Appearance" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm space-y-6">
            <h3 className="text-lg font-semibold mb-4">Personal Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                  <User className="w-4 h-4" /> Display Name
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Your display name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                  <User className="w-4 h-4" /> Real Name
                </label>
                <Input
                  value={formData.realName}
                  onChange={(e) => setFormData({ ...formData, realName: e.target.value })}
                  placeholder="Your real name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" /> Occupation
                </label>
                <Input
                  value={formData.occupation}
                  onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                  placeholder="Your occupation"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Location
                </label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="City, Country"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                  <Globe className="w-4 h-4" /> Website
                </label>
                <Input
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://yourwebsite.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                  <Phone className="w-4 h-4" /> Phone
                </label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 234 567 890"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Date of Birth
                </label>
                <Input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Bio
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell us about yourself..."
                className="w-full px-3 py-2 border rounded-lg resize-none h-24 dark:bg-gray-700 dark:border-gray-600"
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">{formData.bio.length}/500 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                <Heart className="w-4 h-4" /> Hobbies & Interests
              </label>
              <Input
                value={formData.hobbies}
                onChange={(e) => setFormData({ ...formData, hobbies: e.target.value })}
                placeholder="Reading, Gaming, Music, etc."
              />
              <p className="text-xs text-gray-500 mt-1">Separate with commas</p>
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-purple-600"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}

        {/* Privacy Tab */}
        {activeTab === "privacy" && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm space-y-6">
            <h3 className="text-lg font-semibold mb-4">Privacy Settings</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-medium">Show Email Address</p>
                    <p className="text-sm text-gray-500">Let others see your email</p>
                  </div>
                </div>
                <Switch checked={showEmail} onCheckedChange={setShowEmail} />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <Eye className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-medium">Online Status</p>
                    <p className="text-sm text-gray-500">Show when you're online</p>
                  </div>
                </div>
                <Switch checked={showOnlineStatus} onCheckedChange={setShowOnlineStatus} />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <EyeOff className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-medium">Last Seen</p>
                    <p className="text-sm text-gray-500">Show last active time</p>
                  </div>
                </div>
                <Switch checked={showLastSeen} onCheckedChange={setShowLastSeen} />
              </div>
            </div>

            <div className="border-t pt-6 mt-6 space-y-4">
              <h4 className="font-medium">Data & Security</h4>

              <button
                onClick={handleExportData}
                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                <div className="flex items-center gap-3">
                  <Download className="w-5 h-5 text-blue-500" />
                  <div className="text-left">
                    <p className="font-medium">Export Your Data</p>
                    <p className="text-sm text-gray-500">Download all your data</p>
                  </div>
                </div>
              </button>

              <button className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600">
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-yellow-500" />
                  <div className="text-left">
                    <p className="font-medium">Change Password</p>
                    <p className="text-sm text-gray-500">Update your password</p>
                  </div>
                </div>
              </button>

              <button className="w-full flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30">
                <div className="flex items-center gap-3">
                  <Trash2 className="w-5 h-5 text-red-500" />
                  <div className="text-left">
                    <p className="font-medium text-red-600">Delete Account</p>
                    <p className="text-sm text-red-400">Permanently delete your account</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm space-y-6">
            <h3 className="text-lg font-semibold mb-4">Notification Preferences</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-gray-500">Receive email for important updates</p>
                  </div>
                </div>
                <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-medium">Push Notifications</p>
                    <p className="text-sm text-gray-500">Get push notifications for messages</p>
                  </div>
                </div>
                <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <Eye className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-medium">Message Preview</p>
                    <p className="text-sm text-gray-500">Show message content in notifications</p>
                  </div>
                </div>
                <Switch checked={messagePreview} onCheckedChange={setMessagePreview} />
              </div>
            </div>
          </div>
        )}

        {/* Appearance Tab */}
        {activeTab === "appearance" && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm space-y-6">
            <h3 className="text-lg font-semibold mb-4">Appearance</h3>

            <div>
              <label className="block text-sm font-medium mb-3">Theme</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "light", label: "Light", icon: "☀️" },
                  { id: "dark", label: "Dark", icon: "🌙" },
                  { id: "system", label: "System", icon: "💻" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id as typeof theme)}
                    className={`p-4 rounded-lg border-2 text-center transition ${
                      theme === t.id
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <span className="text-2xl block mb-1">{t.icon}</span>
                    <span className="text-sm font-medium">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Account Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Member since {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "..."}</p>
        </div>
      </div>
    </div>
  );
}
