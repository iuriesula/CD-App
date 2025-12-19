"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface Dealership {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  phones: string[];
  email: string | null;
  contactEmails: string[];
  website: string | null;
  logoUrl: string | null;
  brandColor: string | null;
  settings: {
    timezones?: {
      timezone1: string;
      timezone1Label: string;
      timezone2: string;
      timezone2Label: string;
    };
  };
}

interface MediaFile {
  id: string;
  name: string;
  type: string;
  url: string;
  mimeType: string | null;
  size: number | null;
  folder: string | null;
  createdAt: string;
}

const TIMEZONE_OPTIONS = [
  { value: "America/New_York", label: "US East Coast (New York)" },
  { value: "America/Chicago", label: "US Central (Chicago)" },
  { value: "America/Denver", label: "US Mountain (Denver)" },
  { value: "America/Los_Angeles", label: "US West Coast (LA)" },
  { value: "America/Anchorage", label: "Alaska" },
  { value: "Pacific/Honolulu", label: "Hawaii" },
  { value: "Europe/London", label: "UK / London" },
  { value: "Europe/Paris", label: "Europe +1 (Paris, Berlin)" },
  { value: "Europe/Bucharest", label: "Europe +2 (Athens, Helsinki)" },
  { value: "Europe/Moscow", label: "Europe +3 (Moscow)" },
  { value: "Asia/Dubai", label: "Dubai / Gulf" },
  { value: "Asia/Tokyo", label: "Japan / Tokyo" },
  { value: "Australia/Sydney", label: "Australia East (Sydney)" },
];

export default function DealershipSettingsPage() {
  const router = useRouter();
  const [dealership, setDealership] = useState<Dealership | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dealershipId, setDealershipId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    phones: [] as string[],
    email: "",
    contactEmails: [] as string[],
    website: "",
  });
  const [timezoneData, setTimezoneData] = useState({
    timezone1: "America/New_York",
    timezone1Label: "New York",
    timezone2: "Europe/Bucharest",
    timezone2Label: "Europe +2",
  });
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");

  // Branding state
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [brandColor, setBrandColor] = useState("#1e40af");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Media state
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  useEffect(() => {
    fetchSession();
  }, []);

  useEffect(() => {
    if (dealershipId) {
      fetchDealership();
    }
  }, [dealershipId]);

  const fetchSession = async () => {
    try {
      const response = await fetch("/api/auth/session");
      const data = await response.json();
      if (!data.session?.dealershipId) {
        router.push("/leads");
        return;
      }
      if (data.session.role !== "manager" && data.session.role !== "agency_admin") {
        router.push("/leads");
        return;
      }
      setDealershipId(data.session.dealershipId);
    } catch (error) {
      console.error("Failed to fetch session:", error);
      router.push("/leads");
    }
  };

  const fetchDealership = async () => {
    try {
      const response = await fetch(`/api/dealerships/${dealershipId}`);
      const data = await response.json();
      if (data.dealership) {
        setDealership(data.dealership);
        setFormData({
          name: data.dealership.name || "",
          address: data.dealership.address || "",
          city: data.dealership.city || "",
          state: data.dealership.state || "",
          zip: data.dealership.zip || "",
          phone: data.dealership.phone || "",
          phones: data.dealership.phones || [],
          email: data.dealership.email || "",
          contactEmails: data.dealership.contactEmails || [],
          website: data.dealership.website || "",
        });
        // Load branding
        setLogoUrl(data.dealership.logoUrl || null);
        setBrandColor(data.dealership.brandColor || "#1e40af");
        // Load timezone settings if available
        if (data.dealership.settings?.timezones) {
          setTimezoneData(data.dealership.settings.timezones);
        }
      }
      // Fetch media files
      await fetchMedia();
    } catch (error) {
      console.error("Failed to fetch dealership:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMedia = async (folder?: string | null) => {
    if (!dealershipId) return;
    try {
      const folderParam = folder !== undefined ? folder : currentFolder;
      const url = folderParam
        ? `/api/dealerships/${dealershipId}/media?folder=${encodeURIComponent(folderParam)}`
        : `/api/dealerships/${dealershipId}/media`;
      const response = await fetch(url);
      const data = await response.json();
      setMedia(data.media || []);
    } catch (error) {
      console.error("Failed to fetch media:", error);
    }
  };

  // Refetch media when folder changes
  useEffect(() => {
    if (dealershipId) {
      fetchMedia(currentFolder);
    }
  }, [currentFolder, dealershipId]);

  const handleCreateFolder = async () => {
    if (!dealershipId || !newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      const formData = new FormData();
      formData.append("type", "folder");
      formData.append("name", newFolderName.trim());
      if (currentFolder) {
        formData.append("folder", currentFolder);
      }

      const response = await fetch(`/api/dealerships/${dealershipId}/media`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create folder");
      }

      setNewFolderName("");
      await fetchMedia(currentFolder);
    } catch (error) {
      console.error("Folder creation failed:", error);
      alert(error instanceof Error ? error.message : "Failed to create folder");
    } finally {
      setCreatingFolder(false);
    }
  };

  const navigateToFolder = (folderItem: MediaFile) => {
    // Build the full path for this folder
    const newPath = currentFolder
      ? `${currentFolder}/${folderItem.name}`
      : folderItem.name;
    setCurrentFolder(newPath);
  };

  const navigateUp = () => {
    if (!currentFolder) return;
    const parts = currentFolder.split("/");
    parts.pop();
    setCurrentFolder(parts.length > 0 ? parts.join("/") : null);
  };

  const navigateToRoot = () => {
    setCurrentFolder(null);
  };

  const getBreadcrumbs = () => {
    if (!currentFolder) return [];
    return currentFolder.split("/");
  };

  const navigateToBreadcrumb = (index: number) => {
    const parts = currentFolder?.split("/") || [];
    const newPath = parts.slice(0, index + 1).join("/");
    setCurrentFolder(newPath);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/dealerships/${dealershipId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          settings: {
            ...(dealership?.settings || {}),
            timezones: timezoneData,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update dealership");
      }

      const data = await response.json();
      setDealership(data.dealership);
      alert("Dealership updated successfully");
    } catch (error) {
      console.error("Failed to update dealership:", error);
      alert(error instanceof Error ? error.message : "Failed to update dealership");
    } finally {
      setSaving(false);
    }
  };

  const addPhone = () => {
    if (newPhone && !formData.phones.includes(newPhone)) {
      setFormData({ ...formData, phones: [...formData.phones, newPhone] });
      setNewPhone("");
    }
  };

  const removePhone = (phone: string) => {
    setFormData({ ...formData, phones: formData.phones.filter((p) => p !== phone) });
  };

  const addEmail = () => {
    if (newEmail && !formData.contactEmails.includes(newEmail)) {
      setFormData({ ...formData, contactEmails: [...formData.contactEmails, newEmail] });
      setNewEmail("");
    }
  };

  const removeEmail = (email: string) => {
    setFormData({ ...formData, contactEmails: formData.contactEmails.filter((e) => e !== email) });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !dealershipId) return;

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "logo");
      formData.append("name", "Logo");

      const response = await fetch(`/api/dealerships/${dealershipId}/media`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const data = await response.json();
      setLogoUrl(data.media.url);
      await fetchMedia();
    } catch (error) {
      console.error("Logo upload failed:", error);
      alert(error instanceof Error ? error.message : "Logo upload failed");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleBrandColorSave = async () => {
    if (!dealershipId) return;
    try {
      const response = await fetch(`/api/dealerships/${dealershipId}/branding`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandColor }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save");
      }
    } catch (error) {
      console.error("Failed to save brand color:", error);
      alert(error instanceof Error ? error.message : "Failed to save brand color");
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !dealershipId) return;

    setUploadingMedia(true);
    try {
      // Upload all selected files
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "general");
        if (currentFolder) {
          formData.append("folder", currentFolder);
        }

        const response = await fetch(`/api/dealerships/${dealershipId}/media`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Upload failed");
        }
      }

      await fetchMedia(currentFolder);
    } catch (error) {
      console.error("Media upload failed:", error);
      alert(error instanceof Error ? error.message : "Media upload failed");
    } finally {
      setUploadingMedia(false);
      // Reset file input
      e.target.value = "";
    }
  };

  const handleDeleteMedia = async (mediaId: string, isFolder: boolean = false) => {
    const confirmMsg = isFolder
      ? "Delete this folder? It must be empty."
      : "Delete this media file?";
    if (!dealershipId || !confirm(confirmMsg)) return;

    try {
      const response = await fetch(`/api/dealerships/${dealershipId}/media?mediaId=${mediaId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Delete failed");
      }

      await fetchMedia(currentFolder);
    } catch (error) {
      console.error("Media delete failed:", error);
      alert(error instanceof Error ? error.message : "Failed to delete");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dealership settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dealership Settings</h1>
        <p className="text-gray-500 mt-1">Manage your dealership information</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dealership Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://www.example.com"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Address</h3>
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                  <input
                    type="text"
                    value={formData.zip}
                    onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Time Zone Clocks */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Time Zone Clocks</h3>
            <p className="text-sm text-gray-500 mb-4">
              Configure the time zones displayed in the header. The third clock is user-adjustable for customer timezone.
            </p>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Clock 1 Timezone
                  </label>
                  <select
                    value={timezoneData.timezone1}
                    onChange={(e) => setTimezoneData({ ...timezoneData, timezone1: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <option key={tz.value} value={tz.value}>{tz.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Clock 1 Label
                  </label>
                  <input
                    type="text"
                    value={timezoneData.timezone1Label}
                    onChange={(e) => setTimezoneData({ ...timezoneData, timezone1Label: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., EST, HQ"
                    maxLength={10}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Clock 2 Timezone
                  </label>
                  <select
                    value={timezoneData.timezone2}
                    onChange={(e) => setTimezoneData({ ...timezoneData, timezone2: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <option key={tz.value} value={tz.value}>{tz.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Clock 2 Label
                  </label>
                  <input
                    type="text"
                    value={timezoneData.timezone2Label}
                    onChange={(e) => setTimezoneData({ ...timezoneData, timezone2Label: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., PST, West Coast"
                    maxLength={10}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
            <div className="grid gap-4">
              {/* Primary Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="(312) 555-0100"
                />
              </div>

              {/* Additional Phones */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Phone Numbers
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add another phone number"
                  />
                  <Button type="button" onClick={addPhone} variant="outline">
                    Add
                  </Button>
                </div>
                {formData.phones.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.phones.map((phone) => (
                      <span
                        key={phone}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm"
                      >
                        {phone}
                        <button
                          type="button"
                          onClick={() => removePhone(phone)}
                          className="text-gray-500 hover:text-red-500"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Primary Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="info@dealership.com"
                />
              </div>

              {/* Additional Emails */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Email Addresses
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add another email"
                  />
                  <Button type="button" onClick={addEmail} variant="outline">
                    Add
                  </Button>
                </div>
                {formData.contactEmails.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.contactEmails.map((email) => (
                      <span
                        key={email}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm"
                      >
                        {email}
                        <button
                          type="button"
                          onClick={() => removeEmail(email)}
                          className="text-gray-500 hover:text-red-500"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Card>

      {/* Branding Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Branding</h3>
        <p className="text-sm text-gray-500 mb-4">
          Customize your dealership&apos;s visual identity for emails and signatures.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logo
            </label>
            <div className="flex items-start gap-4">
              <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Dealership Logo"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload"
                  disabled={uploadingLogo}
                />
                <label
                  htmlFor="logo-upload"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                >
                  {uploadingLogo ? "Uploading..." : "Upload Logo"}
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  PNG, JPG, or SVG. Max 5MB.
                </p>
              </div>
            </div>
          </div>

          {/* Brand Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Brand Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="#1e40af"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleBrandColorSave}
              >
                Save
              </Button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Used in email signatures and templates.
            </p>
          </div>
        </div>
      </Card>

      {/* Media Gallery Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Media Library</h3>
            <p className="text-sm text-gray-500">
              Organize photos in folders. Supports 100+ images per vehicle.
            </p>
          </div>
          <div className="flex gap-2">
            {/* New Folder Button */}
            <button
              onClick={() => {
                const name = prompt("Enter folder name:");
                if (name?.trim()) {
                  setNewFolderName(name.trim());
                  setTimeout(() => handleCreateFolder(), 0);
                }
              }}
              disabled={creatingFolder}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              New Folder
            </button>
            {/* Upload Button */}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleMediaUpload}
              className="hidden"
              id="media-upload"
              disabled={uploadingMedia}
            />
            <label
              htmlFor="media-upload"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 cursor-pointer"
            >
              {uploadingMedia ? "Uploading..." : "Upload Images"}
            </label>
          </div>
        </div>

        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-1 mb-4 text-sm">
          <button
            onClick={navigateToRoot}
            className={`px-2 py-1 rounded hover:bg-gray-100 ${!currentFolder ? "font-semibold text-blue-600" : "text-gray-600"}`}
          >
            Root
          </button>
          {getBreadcrumbs().map((crumb, index) => (
            <span key={index} className="flex items-center">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <button
                onClick={() => navigateToBreadcrumb(index)}
                className={`px-2 py-1 rounded hover:bg-gray-100 ${
                  index === getBreadcrumbs().length - 1 ? "font-semibold text-blue-600" : "text-gray-600"
                }`}
              >
                {crumb}
              </button>
            </span>
          ))}
        </div>

        {/* Back button when in a folder */}
        {currentFolder && (
          <button
            onClick={navigateUp}
            className="flex items-center gap-2 mb-4 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        )}

        {media.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <p>{currentFolder ? "This folder is empty." : "No media files yet."}</p>
            <p className="text-xs mt-1">Upload images or create a folder to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {media.map((file) => (
              <div key={file.id} className="group relative border rounded-lg overflow-hidden">
                {file.type === "folder" ? (
                  /* Folder Display */
                  <button
                    onClick={() => navigateToFolder(file)}
                    className="w-full h-32 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <svg className="w-12 h-12 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                    </svg>
                    <span className="mt-2 text-sm text-gray-700 font-medium truncate max-w-full px-2">
                      {file.name}
                    </span>
                  </button>
                ) : (
                  /* Image Display */
                  <img
                    src={file.url}
                    alt={file.name}
                    className="w-full h-32 object-cover"
                  />
                )}
                {/* Delete overlay - works for both folders and images */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity flex items-center justify-center pointer-events-none">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteMedia(file.id, file.type === "folder");
                    }}
                    className="opacity-0 group-hover:opacity-100 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-opacity pointer-events-auto"
                    title={file.type === "folder" ? "Delete folder" : "Delete"}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                {/* File info - only for non-folders */}
                {file.type !== "folder" && (
                  <div className="p-2 bg-white">
                    <p className="text-xs text-gray-600 truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {file.type === "logo" && <span className="text-blue-600 font-medium">Logo </span>}
                      {file.size && `${(file.size / 1024).toFixed(1)} KB`}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
