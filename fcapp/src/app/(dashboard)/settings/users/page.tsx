"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  voipExtension: string | null;
  createdAt: string;
  dealership?: { id: string; name: string };
}

const roleConfig: Record<string, { label: string; color: string }> = {
  salesperson: { label: "Sales", color: "blue" },
  manager: { label: "Manager", color: "purple" },
  tech: { label: "Tech", color: "green" },
  content_creator: { label: "Content", color: "orange" },
  agency_admin: { label: "Agency Admin", color: "red" },
};

export default function UsersSettingsPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "salesperson",
  });

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const response = await fetch("/api/auth/session");
      const data = await response.json();
      if (data.session?.role !== "manager" && data.session?.role !== "agency_admin") {
        router.push("/leads");
        return;
      }
      setIsManager(true);
      setCurrentUserId(data.session.userId);
      fetchUsers();
    } catch (error) {
      console.error("Failed to check session:", error);
      router.push("/leads");
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create user");
      }

      setShowModal(false);
      setFormData({ name: "", email: "", password: "", role: "salesperson" });
      fetchUsers();
    } catch (error) {
      console.error("Failed to create user:", error);
      alert(error instanceof Error ? error.message : "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    if (!confirm(currentStatus ? "Pause this user's access?" : "Reactivate this user's access?")) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update user");
      }

      fetchUsers();
    } catch (error) {
      console.error("Failed to update user:", error);
      alert(error instanceof Error ? error.message : "Failed to update user");
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to permanently delete ${userName}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete user");
      }

      fetchUsers();
    } catch (error) {
      console.error("Failed to delete user:", error);
      alert(error instanceof Error ? error.message : "Failed to delete user");
    }
  };

  const handleResetPassword = async (userId: string, userName: string) => {
    const newPassword = prompt(`Enter new password for ${userName} (min 6 characters):`);
    if (!newPassword) return;

    if (newPassword.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reset password");
      }

      alert(`Password reset successfully for ${userName}`);
    } catch (error) {
      console.error("Failed to reset password:", error);
      alert(error instanceof Error ? error.message : "Failed to reset password");
    }
  };

  if (!isManager) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Checking permissions...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
          <p className="text-gray-500 mt-1">Manage users in your dealership</p>
        </div>
        <Button onClick={() => setShowModal(true)}>Add User</Button>
      </div>

      {users.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-gray-500">
            <p className="text-lg font-medium">No users yet</p>
            <p className="mt-1">Add your first team member to get started</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {users.map((user) => {
            const role = roleConfig[user.role] || { label: user.role, color: "gray" };
            return (
              <Card key={user.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{user.name}</span>
                        <Badge variant={role.color as any}>{role.label}</Badge>
                        {!user.isActive && (
                          <Badge variant="gray">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  {user.id !== currentUserId && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleResetPassword(user.id, user.name)}
                        className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        Reset Password
                      </button>
                      <button
                        onClick={() => handleToggleActive(user.id, user.isActive)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                          user.isActive
                            ? "text-yellow-700 bg-yellow-50 hover:bg-yellow-100"
                            : "text-green-700 bg-green-50 hover:bg-green-100"
                        }`}
                      >
                        {user.isActive ? "Pause" : "Activate"}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id, user.name)}
                        className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Add New User</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="john@dealership.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Min 6 characters"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="salesperson">Sales</option>
                  <option value="manager">Manager</option>
                  <option value="tech">Tech</option>
                  <option value="content_creator">Content Creator</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowModal(false);
                    setFormData({ name: "", email: "", password: "", role: "salesperson" });
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Creating..." : "Create User"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
