import { normalizeRoleName } from "@/lib/auth/config";
import { isCampaignTeamLeaderRole } from "@/lib/auth/tl-access";

export type TeamMember = {
  id: string;
  full_name: string | null;
  email: string | null;
  agent_code: string | null;
  status: string;
};

export type TeamLeaderNode = {
  id: string;
  full_name: string | null;
  email: string | null;
  agents: TeamMember[];
  agent_count: number;
  campaign_count: number;
};

export type TeamHierarchyStats = {
  team_leader_count: number;
  total_agents: number;
  assigned_agents: number;
  unassigned_agents: number;
};

export type TeamHierarchyData = {
  team_leaders: TeamLeaderNode[];
  unassigned_agents: TeamMember[];
  stats: TeamHierarchyStats;
};

type UserWithRoles = {
  id: string;
  full_name: string | null;
  email: string | null;
  agent_code: string | null;
  status: string;
  reporting_manager_id: string | null;
  user_roles: { roles: { name: string } | null }[] | null;
};

function userHasRole(
  user: UserWithRoles,
  predicate: (roleName: string | null | undefined) => boolean
): boolean {
  const ur = user.user_roles;
  if (!ur || !Array.isArray(ur)) return false;
  return ur.some((r) => predicate(r.roles?.name));
}

export function isAgentRole(roleName: string | null | undefined): boolean {
  return normalizeRoleName(roleName) === "agent";
}

function displayLabel(user: { full_name: string | null; email: string | null; agent_code?: string | null }): string {
  const name = user.full_name?.trim() || user.email?.trim() || "Unknown";
  const code = user.agent_code?.trim();
  return code ? `${name} (${code})` : name;
}

export function getTeamMemberLabel(member: TeamMember): string {
  return displayLabel(member);
}

export function getTeamLeaderLabel(tl: Pick<TeamLeaderNode, "full_name" | "email">): string {
  return displayLabel(tl);
}

/**
 * Build TL → agents tree from reporting lines and campaign assignments.
 */
export function buildTeamHierarchy(
  users: UserWithRoles[],
  campaigns: { id: string; assigned_team_leader_id: string | null }[],
  assignments: { campaign_id: string; agent_id: string }[]
): TeamHierarchyData {
  const activeUsers = users.filter((u) => u.status === "active");

  const teamLeaders = activeUsers.filter((u) =>
    userHasRole(u, isCampaignTeamLeaderRole)
  );

  const agents = activeUsers.filter((u) => userHasRole(u, isAgentRole));

  const campaignCountByTl = new Map<string, number>();
  const campaignTlById = new Map<string, string | null>();

  for (const c of campaigns) {
    campaignTlById.set(c.id, c.assigned_team_leader_id);
    if (c.assigned_team_leader_id) {
      campaignCountByTl.set(
        c.assigned_team_leader_id,
        (campaignCountByTl.get(c.assigned_team_leader_id) ?? 0) + 1
      );
    }
  }

  const agentsByTlFromCampaigns = new Map<string, Set<string>>();
  for (const row of assignments) {
    const tlId = campaignTlById.get(row.campaign_id);
    if (!tlId) continue;
    if (!agentsByTlFromCampaigns.has(tlId)) {
      agentsByTlFromCampaigns.set(tlId, new Set());
    }
    agentsByTlFromCampaigns.get(tlId)!.add(row.agent_id);
  }

  const agentById = new Map(agents.map((a) => [a.id, a]));
  const assignedAgentIds = new Set<string>();

  const team_leader_nodes: TeamLeaderNode[] = teamLeaders.map((tl) => {
    const agentIdSet = new Set<string>();

    for (const agent of agents) {
      if (agent.reporting_manager_id === tl.id) {
        agentIdSet.add(agent.id);
      }
    }

    for (const agentId of agentsByTlFromCampaigns.get(tl.id) ?? []) {
      agentIdSet.add(agentId);
    }

    const tlAgents: TeamMember[] = [...agentIdSet]
      .map((id) => agentById.get(id))
      .filter((a): a is UserWithRoles => Boolean(a))
      .map((a) => ({
        id: a.id,
        full_name: a.full_name,
        email: a.email,
        agent_code: a.agent_code,
        status: a.status,
      }))
      .sort((a, b) => getTeamMemberLabel(a).localeCompare(getTeamMemberLabel(b)));

    for (const id of agentIdSet) {
      assignedAgentIds.add(id);
    }

    return {
      id: tl.id,
      full_name: tl.full_name,
      email: tl.email,
      agents: tlAgents,
      agent_count: tlAgents.length,
      campaign_count: campaignCountByTl.get(tl.id) ?? 0,
    };
  });

  team_leader_nodes.sort((a, b) =>
    getTeamLeaderLabel(a).localeCompare(getTeamLeaderLabel(b))
  );

  const unassigned_agents: TeamMember[] = agents
    .filter((a) => !assignedAgentIds.has(a.id))
    .map((a) => ({
      id: a.id,
      full_name: a.full_name,
      email: a.email,
      agent_code: a.agent_code,
      status: a.status,
    }))
    .sort((a, b) => getTeamMemberLabel(a).localeCompare(getTeamMemberLabel(b)));

  const assigned_agents = assignedAgentIds.size;

  return {
    team_leaders: team_leader_nodes,
    unassigned_agents,
    stats: {
      team_leader_count: team_leader_nodes.length,
      total_agents: agents.length,
      assigned_agents,
      unassigned_agents: unassigned_agents.length,
    },
  };
}
