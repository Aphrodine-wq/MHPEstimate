import { useState } from "react";
import * as Sentry from "@sentry/nextjs";
import toast from "react-hot-toast";
import { useTeamMembers, useCurrentUser } from "../lib/store";
import { supabase } from "../lib/supabase";
import { InviteTeamMemberModal } from "./InviteTeamMemberModal";
import type { TeamMember, TeamRole } from "@proestimate/shared/types";

const ROLE_BADGE: Record<TeamRole, string> = {
  owner:      "bg-purple-100 text-purple-800",
  admin:      "bg-red-100 text-red-800",
  estimator:  "bg-blue-100 text-blue-800",
  pm:         "bg-green-100 text-green-800",
  field_tech: "bg-orange-100 text-orange-800",
  sales:      "bg-yellow-100 text-yellow-800",
};

const ROLE_LABEL: Record<TeamRole, string> = {
  owner:      "Owner",
  admin:      "Admin",
  estimator:  "Estimator",
  pm:         "Project Manager",
  field_tech: "Field Tech",
  sales:      "Sales",
};

const ALL_ROLES: TeamRole[] = ["owner", "admin", "estimator", "pm", "field_tech", "sales"];

// A member is "invited" when auth_id is null and is_active is false
function isInvited(member: TeamMember): boolean {
  return !member.auth_id && !member.is_active;
}

function MemberAvatar({ name }: { name: string }) {
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "--";
  return (
    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--gray5)] text-[13px] font-semibold text-[var(--gray1)]">
      {initials}
    </div>
  );
}

export function TeamMembersPage() {
  const { members, loading, refresh } = useTeamMembers();
  const { user: currentUser } = useCurrentUser();
  const [updatingId,   setUpdatingId]   = useState<string | null>(null);
  const [resendingId,  setResendingId]  = useState<string | null>(null);
  const [inviteOpen,   setInviteOpen]   = useState(false);

  const canEdit = currentUser?.role === "admin" || currentUser?.role === "owner";

  const handleRoleChange = async (member: TeamMember, newRole: TeamRole) => {
    if (!supabase || !canEdit) return;
    setUpdatingId(member.id);
    try {
      const { error } = await supabase
        .from("team_members")
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq("id", member.id);
      if (error) {
        Sentry.captureException(error);
        toast.error("Failed to update role");
      } else {
        toast.success(`${member.full_name}'s role updated to ${ROLE_LABEL[newRole]}`);
      }
    } catch (err) {
      Sentry.captureException(err);
      toast.error("Failed to update role");
    }
    setUpdatingId(null);
  };

  const handleToggleActive = async (member: TeamMember) => {
    if (!supabase || !canEdit) return;
    setUpdatingId(member.id);
    const newActive = !member.is_active;
    try {
      const { error } = await supabase
        .from("team_members")
        .update({ is_active: newActive, updated_at: new Date().toISOString() })
        .eq("id", member.id);
      if (error) {
        Sentry.captureException(error);
        toast.error("Failed to update member status");
      } else {
        toast.success(`${member.full_name} ${newActive ? "activated" : "deactivated"}`);
      }
    } catch (err) {
      Sentry.captureException(err);
      toast.error("Failed to update member status");
    }
    setUpdatingId(null);
  };

  const handleResendInvite = async (member: TeamMember) => {
    if (!canEdit) return;
    setResendingId(member.id);
    try {
      const res = await fetch("/api/team/invite/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: member.id, email: member.email }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) {
        toast.error(json.error ?? "Failed to resend invite");
      } else {
        toast.success(`Invite resent to ${member.email}`);
      }
    } catch (err) {
      Sentry.captureException(err);
      toast.error("Failed to resend invite");
    }
    setResendingId(null);
  };

  const handleRevokeInvite = async (member: TeamMember) => {
    if (!supabase || !canEdit) return;
    if (!window.confirm(`Revoke the invite for ${member.full_name} (${member.email})? This will remove them from the team.`)) return;
    setUpdatingId(member.id);
    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", member.id);
      if (error) {
        Sentry.captureException(error);
        toast.error("Failed to revoke invite");
      } else {
        toast.success(`Invite for ${member.full_name} revoked`);
        await refresh();
      }
    } catch (err) {
      Sentry.captureException(err);
      toast.error("Failed to revoke invite");
    }
    setUpdatingId(null);
  };

  return (
    <>
      <div className="flex h-full flex-col overflow-y-auto">
        <header className="flex items-center justify-between px-4 md:px-8 pt-4 pb-1">
          <p className="text-[12px] text-[var(--secondary)]">
            {members.length} team member{members.length !== 1 ? "s" : ""}
          </p>
          {canEdit && (
            <button
              onClick={() => setInviteOpen(true)}
              className="rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-sm shadow-[var(--accent)]/20 transition-all hover:brightness-110 active:scale-[0.98]"
            >
              Invite Member
            </button>
          )}
        </header>

        <div className="flex-1 px-4 md:px-8 py-4">
          {loading ? (
            <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-4 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-10 w-10 animate-pulse rounded-full bg-[var(--gray5)]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-36 animate-pulse rounded bg-[var(--gray5)]" />
                    <div className="h-2.5 w-48 animate-pulse rounded bg-[var(--gray5)]" />
                  </div>
                </div>
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--gray5)]">
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="var(--gray2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <p className="text-[15px] font-semibold">No team members</p>
              <p className="mt-1 text-[13px] text-[var(--secondary)]">Team members are added by your admin</p>
              {canEdit && (
                <button
                  onClick={() => setInviteOpen(true)}
                  className="mt-4 rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]"
                >
                  Invite your first member
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] overflow-hidden">
              {/* Table header — md+ only */}
              <div className="hidden md:grid md:grid-cols-[2.5fr_2fr_1fr_1fr_auto] gap-4 border-b border-[var(--sep)] px-5 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--secondary)]">Member</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--secondary)]">Contact</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--secondary)]">Role</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--secondary)]">Status</p>
                {canEdit && <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--secondary)]">Actions</p>}
              </div>

              {members.map((member, i, arr) => {
                const isLast      = i === arr.length - 1;
                const isUpdating  = updatingId  === member.id;
                const isResending = resendingId === member.id;
                const invited     = isInvited(member);

                return (
                  <div
                    key={member.id}
                    className={`flex flex-col gap-3 px-5 py-4 md:grid md:grid-cols-[2.5fr_2fr_1fr_1fr_auto] md:items-center md:gap-4 transition-colors hover:bg-[var(--bg)] ${isLast ? "" : "border-b border-[var(--sep)]"} ${!member.is_active && !invited ? "opacity-50" : ""}`}
                  >
                    {/* Member info */}
                    <div className="flex items-center gap-3">
                      <MemberAvatar name={member.full_name} />
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold truncate">{member.full_name}</p>
                        {member.phone && (
                          <p className="text-[11px] text-[var(--secondary)] truncate">{member.phone}</p>
                        )}
                      </div>
                    </div>

                    {/* Contact */}
                    <p className="text-[12px] text-[var(--secondary)] truncate">{member.email}</p>

                    {/* Role */}
                    <div>
                      {canEdit && !invited ? (
                        <select
                          value={member.role}
                          disabled={isUpdating}
                          onChange={(e) => handleRoleChange(member, e.target.value as TeamRole)}
                          className="rounded-md border border-[var(--sep)] bg-[var(--bg)] px-2 py-1 text-[12px] font-medium outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 disabled:opacity-50 cursor-pointer"
                        >
                          {ALL_ROLES.map((r) => (
                            <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${ROLE_BADGE[member.role]}`}>
                          {ROLE_LABEL[member.role]}
                        </span>
                      )}
                    </div>

                    {/* Status */}
                    <div>
                      {invited ? (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                          Invited
                        </span>
                      ) : (
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${member.is_active ? "bg-[#e8f5e9] text-[#2e7d32]" : "bg-[var(--gray5)] text-[var(--gray1)]"}`}>
                          {member.is_active ? "Active" : "Inactive"}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    {canEdit && (
                      <div className="flex items-center gap-2">
                        {invited ? (
                          <>
                            <button
                              onClick={() => handleResendInvite(member)}
                              disabled={isResending || isUpdating}
                              className="rounded-md border border-amber-300 px-3 py-1 text-[11px] font-medium text-amber-700 transition-all hover:bg-amber-50 disabled:opacity-50"
                            >
                              {isResending ? "..." : "Resend Invite"}
                            </button>
                            <button
                              onClick={() => handleRevokeInvite(member)}
                              disabled={isResending || isUpdating}
                              className="rounded-md border border-red-300 px-3 py-1 text-[11px] font-medium text-red-600 transition-all hover:bg-red-50 disabled:opacity-50"
                            >
                              {isUpdating ? "..." : "Revoke"}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleToggleActive(member)}
                            disabled={isUpdating}
                            className={`rounded-md border px-3 py-1 text-[11px] font-medium transition-all disabled:opacity-50 ${
                              member.is_active
                                ? "border-[var(--sep)] text-[var(--secondary)] hover:bg-[var(--gray5)]"
                                : "border-[#22c55e]/40 text-[#22c55e] hover:bg-[#e8f5e9]"
                            }`}
                          >
                            {isUpdating ? "..." : member.is_active ? "Deactivate" : "Activate"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <InviteTeamMemberModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInviteSent={refresh}
      />
    </>
  );
}
