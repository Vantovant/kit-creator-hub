// Settings page

import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useInboxAccounts } from "@/hooks/useInboxAccounts";
import {
  User,
  Mail,
  Bell,
  Palette,
  Moon,
  Sun,
  Save,
  Camera,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { EmailSignaturePreview } from "@/components/dashboard/EmailSignaturePreview";

export default function SettingsPage() {
  const { user } = useAuth();
  const { accounts: inboxAccounts, refresh: refreshInboxAccounts, addAccount, removeAccount } = useInboxAccounts();
  const [saving, setSaving] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [activeTab, setActiveTab] = useState(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    return ["profile", "notifications", "appearance", "email"].includes(tab || "") ? tab! : "profile";
  });
  const [gmailRefreshing, setGmailRefreshing] = useState(false);
  const [gmailMessage, setGmailMessage] = useState<string | null>(null);
  const [gmailEmail, setGmailEmail] = useState("");
  const [gmailLabel, setGmailLabel] = useState("Work");
  const [gmailSaving, setGmailSaving] = useState(false);
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);
  const [mfaSetup, setMfaSetup] = useState<{ factorId: string; challengeId: string; qrCode: string; secret: string } | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaVerifying, setMfaVerifying] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("kit-theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("kit-theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const url = new URL(window.location.href);
    if (value === "profile") url.searchParams.delete("tab");
    else url.searchParams.set("tab", value);
    window.history.replaceState(null, "", url.toString());
  };

  const refreshAuthorizedGmailAccounts = async () => {
    setGmailRefreshing(true);
    setGmailMessage(null);
    try {
      const { data, error } = await supabase.functions.invoke("gmail-sync", {
        body: { discover_accounts: true },
      });
      if (error) throw error;
      const count = Array.isArray((data as any)?.accounts) ? (data as any).accounts.length : 0;
      setGmailMessage(count ? `${count} authorized Gmail account${count === 1 ? "" : "s"} ready.` : "No authorized Gmail accounts found yet.");
      await refreshInboxAccounts();
    } catch (e: any) {
      setGmailMessage(e.message || "Could not refresh Gmail authorizations.");
    } finally {
      setGmailRefreshing(false);
    }
  };

  const registerGmailAccount = async () => {
    const trimmedEmail = gmailEmail.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setGmailMessage("Enter a valid Gmail address first.");
      return;
    }
    setGmailSaving(true);
    setGmailMessage(null);
    try {
      await addAccount(trimmedEmail, gmailLabel.trim() || "Inbox");
      setGmailEmail("");
      setGmailLabel("Work");
      setGmailMessage("Mailbox added as pending. Authorize it through the connector card in chat, then refresh here.");
    } catch (e: any) {
      setGmailMessage(e.message || "Could not add Gmail account.");
    } finally {
      setGmailSaving(false);
    }
  };

  const deleteGmailAccount = async (accountId: string) => {
    if (!confirm("Remove this Gmail inbox from Zazi Mail?")) return;
    setGmailMessage(null);
    try {
      await removeAccount(accountId);
      setGmailMessage("Gmail inbox removed from the app.");
    } catch (e: any) {
      setGmailMessage(e.message || "Could not remove Gmail account.");
    }
  };

  const enable2FA = async () => {
    setSecurityMessage(null);
    setMfaSetup(null);
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const existing = factors?.totp?.find((factor) => factor.status === "verified");
      if (existing) {
        setSecurityMessage("2FA is already enabled for this account.");
        return;
      }
      const { data: enrolled, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (enrollError) throw enrollError;
      const factorId = enrolled.id;
      const { data: challenged, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;
      setMfaSetup({
        factorId,
        challengeId: challenged.id,
        qrCode: enrolled.totp.qr_code,
        secret: enrolled.totp.secret,
      });
      setSecurityMessage("Scan the QR code, then enter the 6-digit code to finish enabling 2FA.");
    } catch (e: any) {
      setSecurityMessage(e.message || "2FA is not available for this account yet.");
    }
  };

  const verify2FA = async () => {
    if (!mfaSetup || mfaCode.trim().length < 6) return;
    setMfaVerifying(true);
    setSecurityMessage(null);
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId: mfaSetup.factorId,
        challengeId: mfaSetup.challengeId,
        code: mfaCode.trim(),
      });
      if (error) throw error;
      setMfaSetup(null);
      setMfaCode("");
      setSecurityMessage("2FA enabled successfully.");
    } catch (e: any) {
      setSecurityMessage(e.message || "Could not verify that 2FA code.");
    } finally {
      setMfaVerifying(false);
    }
  };

  const [notifications, setNotifications] = useState({
    emailDigest: true,
    newSubscriber: true,
    weeklyReport: true,
    productUpdates: false,
    marketingEmails: false,
  });

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    company: "",
    website: "",
    timezone: "Africa/Johannesburg",
  });

  // Load profile from database
  useEffect(() => {
    if (!user) return;

    // Set email from auth user
    setProfile((prev) => ({ ...prev, email: user.email || "" }));

    async function loadProfile() {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, company, website, timezone")
        .eq("user_id", user!.id)
        .single();

      if (data) {
        setProfile((prev) => ({
          ...prev,
          name: data.display_name || "",
          company: (data as any).company || "",
          website: (data as any).website || "",
          timezone: (data as any).timezone || "Africa/Johannesburg",
        }));
      }
    }

    loadProfile();
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase
        .from("profiles")
        .update({
          display_name: profile.name,
          company: profile.company,
          website: profile.website,
          timezone: profile.timezone,
        } as any)
        .eq("user_id", user.id);
    } finally {
      setSaving(false);
    }
  };

  const initials = profile.name
    ? profile.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <div className="min-h-screen">
      <DashboardHeader
        title="Settings"
        subtitle="Manage your account and preferences"
      />

      <main className="p-6">
        <div className="max-w-4xl mx-auto">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="bg-white dark:bg-gray-800 p-1 gap-1">
              <TabsTrigger value="profile" className="gap-2">
                <User className="w-4 h-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2">
                <Bell className="w-4 h-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="appearance" className="gap-2">
                <Palette className="w-4 h-4" />
                Appearance
              </TabsTrigger>
              <TabsTrigger value="email" className="gap-2">
                <Mail className="w-4 h-4" />
                Email Settings
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card className="bg-white dark:bg-gray-800">
                <CardHeader>
                  <CardTitle className="text-lg dark:text-gray-100">Profile Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar */}
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-[#5CC5DE] flex items-center justify-center text-white text-2xl font-bold">
                        {initials}
                      </div>
                      <button
                        type="button"
                        className="absolute bottom-0 right-0 p-1.5 bg-white dark:bg-gray-700 rounded-full shadow-lg border border-gray-200 dark:border-gray-600"
                      >
                        <Camera className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                      </button>
                    </div>
                    <div>
                      <h3 className="font-medium dark:text-gray-100">{profile.name || "—"}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{profile.email}</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="dark:text-gray-200">Full Name</Label>
                      <Input
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        className="dark:bg-gray-700 dark:border-gray-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="dark:text-gray-200">Email Address</Label>
                      <Input
                        type="email"
                        value={profile.email}
                        disabled
                        className="dark:bg-gray-700 dark:border-gray-600 opacity-60"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="dark:text-gray-200">Company</Label>
                      <Input
                        value={profile.company}
                        onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                        className="dark:bg-gray-700 dark:border-gray-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="dark:text-gray-200">Website</Label>
                      <Input
                        value={profile.website}
                        onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                        className="dark:bg-gray-700 dark:border-gray-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="dark:text-gray-200">Timezone</Label>
                    <select
                      value={profile.timezone}
                      onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background dark:bg-gray-700 dark:border-gray-600"
                    >
                      <option value="Africa/Johannesburg">South Africa (SAST)</option>
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      <option value="Europe/London">GMT (London)</option>
                      <option value="Europe/Paris">CET (Paris)</option>
                    </select>
                  </div>

                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={saveProfile}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-[#5CC5DE] hover:bg-[#4AB5CE] text-black font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {saving ? "Saving…" : "Save Changes"}
                    </button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800">
                <CardHeader>
                  <CardTitle className="text-lg dark:text-gray-100">Security</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium dark:text-gray-100">Password</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Change your account password
                      </p>
                    </div>
                    <button
                      type="button"
                      className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Change Password
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium dark:text-gray-100">Two-Factor Authentication</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Add an extra layer of security
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={enable2FA}
                      className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <span className="inline-flex items-center gap-2"><ShieldCheck className="w-4 h-4" />
                      Enable 2FA
                      </span>
                    </button>
                  </div>
                  {securityMessage && <p className="text-sm text-muted-foreground">{securityMessage}</p>}
                  {mfaSetup && (
                    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                      <img src={mfaSetup.qrCode} alt="Two-factor authentication QR code" className="w-40 h-40 rounded-md bg-white p-2" />
                      <p className="text-xs text-muted-foreground break-all">Manual key: {mfaSetup.secret}</p>
                      <div className="flex gap-2">
                        <Input
                          value={mfaCode}
                          onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="6-digit code"
                          inputMode="numeric"
                          className="max-w-40 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <button
                          type="button"
                          onClick={verify2FA}
                          disabled={mfaVerifying || mfaCode.length < 6}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg transition-colors disabled:opacity-50"
                        >
                          {mfaVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                          Verify
                        </button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <Card className="bg-white dark:bg-gray-800">
                <CardHeader>
                  <CardTitle className="text-lg dark:text-gray-100">Email Notifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium dark:text-gray-100">Daily Email Digest</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Receive a daily summary of your account activity
                      </p>
                    </div>
                    <Switch
                      checked={notifications.emailDigest}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, emailDigest: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium dark:text-gray-100">New Subscriber Alerts</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Get notified when someone subscribes
                      </p>
                    </div>
                    <Switch
                      checked={notifications.newSubscriber}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, newSubscriber: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium dark:text-gray-100">Weekly Performance Report</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Receive weekly analytics summary
                      </p>
                    </div>
                    <Switch
                      checked={notifications.weeklyReport}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, weeklyReport: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium dark:text-gray-100">Product Updates</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Learn about new features and improvements
                      </p>
                    </div>
                    <Switch
                      checked={notifications.productUpdates}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, productUpdates: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium dark:text-gray-100">Marketing Emails</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Tips and resources to grow your audience
                      </p>
                    </div>
                    <Switch
                      checked={notifications.marketingEmails}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, marketingEmails: checked })
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="space-y-6">
              <Card className="bg-white dark:bg-gray-800">
                <CardHeader>
                  <CardTitle className="text-lg dark:text-gray-100">Theme</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {theme === "dark" ? (
                        <Moon className="w-5 h-5 text-[#5CC5DE]" />
                      ) : (
                        <Sun className="w-5 h-5 text-amber-500" />
                      )}
                      <div>
                        <p className="font-medium dark:text-gray-100">Dark Mode</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Switch between light and dark themes
                        </p>
                      </div>
                    </div>
                    <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
                  </div>

                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="font-medium mb-4 dark:text-gray-100">Preview</p>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => { if (theme !== "light") toggleTheme(); }}
                        className={`p-4 rounded-xl border-2 transition-colors ${
                          theme === "light"
                            ? "border-[#5CC5DE] bg-white"
                            : "border-gray-200 dark:border-gray-600 bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <Sun className="w-4 h-4 text-amber-500" />
                          <span className="text-sm font-medium text-gray-900">Light</span>
                        </div>
                        <div className="space-y-2">
                          <div className="h-2 bg-gray-200 rounded w-full" />
                          <div className="h-2 bg-gray-200 rounded w-3/4" />
                          <div className="h-2 bg-gray-200 rounded w-1/2" />
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (theme !== "dark") toggleTheme(); }}
                        className={`p-4 rounded-xl border-2 transition-colors ${
                          theme === "dark"
                            ? "border-[#5CC5DE] bg-gray-800"
                            : "border-gray-200 bg-gray-800"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <Moon className="w-4 h-4 text-[#5CC5DE]" />
                          <span className="text-sm font-medium text-white">Dark</span>
                        </div>
                        <div className="space-y-2">
                          <div className="h-2 bg-gray-600 rounded w-full" />
                          <div className="h-2 bg-gray-600 rounded w-3/4" />
                          <div className="h-2 bg-gray-600 rounded w-1/2" />
                        </div>
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Email Settings Tab */}
            <TabsContent value="email" className="space-y-6">
              <Card className="bg-white dark:bg-gray-800">
                <CardHeader>
                  <CardTitle className="text-lg dark:text-gray-100">Gmail Inbox Authorization</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-primary mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-medium dark:text-gray-100">Connect each Gmail mailbox through Lovable Connectors.</p>
                        <p className="text-sm text-muted-foreground">
                          The inbox can sync multiple authorized Gmail connections. After authorizing a mailbox, refresh here and Zazi Mail will match the authorized email address before syncing, replying, or archiving.
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[1fr_160px_auto]">
                      <Input
                        type="email"
                        placeholder="newgmail@example.com"
                        value={gmailEmail}
                        onChange={(e) => setGmailEmail(e.target.value)}
                        className="dark:bg-gray-700 dark:border-gray-600"
                      />
                      <Input
                        placeholder="Label"
                        value={gmailLabel}
                        onChange={(e) => setGmailLabel(e.target.value)}
                        className="dark:bg-gray-700 dark:border-gray-600"
                      />
                      <button
                        type="button"
                        onClick={registerGmailAccount}
                        disabled={gmailSaving}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        {gmailSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Add Gmail
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={refreshAuthorizedGmailAccounts}
                        disabled={gmailRefreshing}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        {gmailRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        {gmailRefreshing ? "Checking…" : "Refresh authorized Gmail accounts"}
                      </button>
                      <a
                        href="/dashboard/integrations"
                        className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                      >
                        <Mail className="w-4 h-4" /> Open integrations
                      </a>
                    </div>
                    {gmailMessage && (
                      <p className="text-sm text-muted-foreground">{gmailMessage}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    {inboxAccounts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No Gmail inboxes are registered yet.</p>
                    ) : inboxAccounts.map((account) => {
                      const authorized = account.status === "connected" && !account.sync_error;
                      return (
                        <div key={account.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                          <div>
                            <p className="font-medium dark:text-gray-100">{account.label || account.email_address}</p>
                            <p className="text-sm text-muted-foreground">{account.email_address}</p>
                            {account.sync_error && <p className="text-xs text-destructive mt-1">{account.sync_error}</p>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              {authorized ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <AlertTriangle className="w-4 h-4 text-destructive" />}
                              {authorized ? "Authorized" : "Needs authorization"}
                            </div>
                            <button
                              type="button"
                              onClick={() => deleteGmailAccount(account.id)}
                              className="p-2 rounded hover:bg-destructive/10 text-destructive transition-colors"
                              title="Remove Gmail inbox"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <EmailSignaturePreview />
              <Card className="bg-white dark:bg-gray-800">
                <CardHeader>
                  <CardTitle className="text-lg dark:text-gray-100">Default Sender Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="dark:text-gray-200">From Name</Label>
                      <Input
                        defaultValue="Vanto Zazi"
                        className="dark:bg-gray-700 dark:border-gray-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="dark:text-gray-200">Reply-to Email</Label>
                      <Input
                        type="email"
                        defaultValue="vanto@reply.onlinecourseformlm.com"
                        className="dark:bg-gray-700 dark:border-gray-600"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="dark:text-gray-200">Email Footer</Label>
                    <textarea
                      defaultValue="You're receiving this email because you registered in APLGO."
                      className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background dark:bg-gray-700 dark:border-gray-600 resize-none"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800">
                <CardHeader>
                  <CardTitle className="text-lg dark:text-gray-100">Email Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium dark:text-gray-100">Track Opens</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Track when subscribers open your emails
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium dark:text-gray-100">Track Clicks</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Track when subscribers click links
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium dark:text-gray-100">Include Unsubscribe Link</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Automatically add unsubscribe link to emails
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
