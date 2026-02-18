import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Copy, Pencil, Plus, Trash2, Users } from "lucide-react";
import { usersApi } from "@/services/users";
import type { InviteUserPayload, ManagedUser, UserRole } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function UserManagementPage() {
  const { isAdmin } = useAuth();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite dialog state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteData, setInviteData] = useState<InviteUserPayload>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role: "developer",
  });
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  // Invite success dialog state
  const [inviteSentOpen, setInviteSentOpen] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteWarning, setInviteWarning] = useState("");

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [editData, setEditData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    role: "developer" as UserRole,
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete dialog state
  const [deleteUser, setDeleteUser] = useState<ManagedUser | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const fetchUsers = async () => {
    try {
      const { data } = await usersApi.list();
      setUsers(data.results);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteSubmitting(true);
    try {
      const { data } = await usersApi.invite(inviteData);
      setInviteUrl(data.invite_url);
      setInviteWarning(data.warning ?? "");
      setInviteOpen(false);
      setInviteData({ first_name: "", last_name: "", email: "", phone: "", role: "developer" });
      setInviteSentOpen(true);
      fetchUsers();
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: { email?: string[] } } })?.response?.data;
      if (errData?.email) {
        toast.error(errData.email[0]);
      } else {
        toast.error("Failed to send invite");
      }
    } finally {
      setInviteSubmitting(false);
    }
  };

  const openEdit = (u: ManagedUser) => {
    setEditUser(u);
    setEditData({
      first_name: u.first_name,
      last_name: u.last_name,
      phone: u.phone,
      role: u.role,
    });
    setEditOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setEditSubmitting(true);
    try {
      await usersApi.update(editUser.id, editData);
      toast.success("User updated");
      setEditOpen(false);
      setEditUser(null);
      fetchUsers();
    } catch {
      toast.error("Failed to update user");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setDeleteSubmitting(true);
    try {
      await usersApi.delete(deleteUser.id);
      toast.success("User removed");
      setDeleteUser(null);
      fetchUsers();
    } catch {
      toast.error("Failed to remove user");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground">Invite and manage team members</p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Invite User
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Users className="mx-auto mb-2 h-8 w-8" />
              <p>No users yet. Invite team members to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.first_name || u.last_name
                        ? `${u.first_name} ${u.last_name}`.trim()
                        : u.username}
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.phone || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                        {u.role === "admin" ? "Admin" : "Developer"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={u.status === "active" ? "default" : "outline"}
                        className={
                          u.status === "invited"
                            ? "border-yellow-400 text-yellow-600 bg-yellow-50"
                            : ""
                        }
                      >
                        {u.status === "invited" ? "Invited" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(u.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(u)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteUser(u)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invite User Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>
              Send an invite link for a new team member to set their password and join.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  value={inviteData.first_name}
                  onChange={(e) => setInviteData({ ...inviteData, first_name: e.target.value })}
                  placeholder="Jane"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={inviteData.last_name}
                  onChange={(e) => setInviteData({ ...inviteData, last_name: e.target.value })}
                  placeholder="Smith"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={inviteData.email}
                onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                placeholder="jane@company.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Phone (optional)</Label>
              <Input
                value={inviteData.phone ?? ""}
                onChange={(e) => setInviteData({ ...inviteData, phone: e.target.value })}
                placeholder="+1 555 000 0000"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={inviteData.role}
                onValueChange={(v) => setInviteData({ ...inviteData, role: v as UserRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="developer">Developer (Sandbox only)</SelectItem>
                  <SelectItem value="admin">Admin (Full access)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={inviteSubmitting}>
                {inviteSubmitting ? "Sending..." : "Send Invite"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invite Sent Dialog */}
      <Dialog open={inviteSentOpen} onOpenChange={setInviteSentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Sent</DialogTitle>
            <DialogDescription>
              Share the link below with the invitee so they can set their password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {inviteWarning && (
              <div className="rounded-lg border border-yellow-400 bg-yellow-50 px-3 py-2 text-sm text-yellow-700">
                ⚠️ {inviteWarning}
              </div>
            )}
            <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
              <code className="flex-1 break-all text-xs">{inviteUrl}</code>
              <Button size="icon" variant="ghost" onClick={() => copyToClipboard(inviteUrl)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This link expires in 72 hours. The user will be activated after they set their password.
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setInviteSentOpen(false);
                setInviteUrl("");
                setInviteWarning("");
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user details and role.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  value={editData.first_name}
                  onChange={(e) => setEditData({ ...editData, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={editData.last_name}
                  onChange={(e) => setEditData({ ...editData, last_name: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={editData.phone}
                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                placeholder="+1 555 000 0000"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={editData.role}
                onValueChange={(v) => setEditData({ ...editData, role: v as UserRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="developer">Developer (Sandbox only)</SelectItem>
                  <SelectItem value="admin">Admin (Full access)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editSubmitting}>
                {editSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong>
                {deleteUser?.first_name
                  ? `${deleteUser.first_name} ${deleteUser.last_name}`.trim()
                  : deleteUser?.email}
              </strong>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSubmitting ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
