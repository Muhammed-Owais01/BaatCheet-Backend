import fetch, { RequestInit, HeadersInit } from "node-fetch";
import env from "@baatcheet/env";

interface RoleAuthFetchOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: Record<string, any>;
  headers?: Record<string, string>;
}

async function roleAuthFetch<T = any>(
  endpoint: string,
  options: RoleAuthFetchOptions = {}
): Promise<T> {
  const { method = "POST", body, headers = {} } = options;

  const config: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    } as HeadersInit,
  };

  if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
    config.body = JSON.stringify(body);
  }

  try {
    console.log(`RoleAuth API Request: ${method} ${env.KRR_PROJECT_URL}${endpoint}`);
    console.log('Request body:', JSON.stringify(body, null, 2));

    const response = await fetch(`${env.KRR_PROJECT_URL}${endpoint}`, config);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`RoleAuth API error response:`, errorText);
      throw new Error(`RoleAuth API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : ({} as T);
  } catch (error) {
    console.error(`RoleAuth API request failed for ${endpoint}:`, error);
    throw error;
  }
}

// Response types
interface User {
  user_id: string;
}

interface Guild {
  guild_id: string;
  owner_id: string;
}

interface Role {
  role_id: string;
  guild_id: string;
  permissions: string[];
}

interface PermissionCheckResponse {
  user: string;
  relation: string;
  allowed: boolean;
}

interface RolePermissionCheckResponse {
  role: string;
  relation: string;
  allowed: boolean;
}

interface DBStats {
  users: number;
  guilds: number;
  roles: number;
  members: number;
}

export class RoleAuthClient {
  // Root & Database
  static async getRoot(): Promise<{ message: string; database: DBStats }> {
    return roleAuthFetch("/", { method: "GET" });
  }

  static async resetDatabase(): Promise<{ status: string }> {
    return roleAuthFetch("/reset", { method: "POST" });
  }

  // Users
  static async listUsers(): Promise<{ users: User[] }> {
    return roleAuthFetch("/users", { method: "GET" });
  }

  static async createUser(userId: string): Promise<{ status: string; user: User }> {
    return roleAuthFetch("/user/create", {
      body: { user_id: userId }
    });
  }

  // Guilds
  static async listGuilds(): Promise<{ guilds: Guild[] }> {
    return roleAuthFetch("/guilds", { method: "GET" });
  }

  static async createGuild(guildId: string, ownerId: string): Promise<{ status: string; guild: Guild }> {
    return roleAuthFetch("/guild/create", {
      body: { 
        guild_id: guildId, 
        owner_id: ownerId 
      }
    });
  }

  static async deleteGuild(guildId: string): Promise<{ status: string }> {
    return roleAuthFetch("/guild/delete", {
      body: { 
        guild_id: guildId 
      }
    });
  }

  static async addMember(guildId: string, userId: string, roleId: string): Promise<{ status: string }> {
    return roleAuthFetch("/guild/add_member", {
      body: { 
        guild_id: guildId, 
        user_id: userId, 
        role_id: roleId 
      }
    });
  }

  static async removeMember(guildId: string, userId: string, roleIds: string[]): Promise<{ status: string }> {
    return roleAuthFetch("/guild/remove_user", {
      body: { 
        guild_id: guildId, 
        user_id: userId, 
        role_ids: roleIds 
      }
    });
  }

  static async changeOwner(guildId: string, newOwnerId: string): Promise<{ status: string }> {
    return roleAuthFetch("/guild/change_owner", {
      body: { 
        guild_id: guildId, 
        new_owner_id: newOwnerId 
      }
    });
  }

  // Roles
  static async listRoles(guildId: string): Promise<{ roles: Role[] }> {
    return roleAuthFetch(`/roles/${guildId}`, { method: "GET" });
  }

  static async createRole(guildId: string, roleId: string, permissions: string[]): Promise<{ status: string; role_id: string }> {
    return roleAuthFetch("/role/create", {
      body: { 
        guild_id: guildId, 
        role_id: roleId, 
        permissions 
      }
    });
  }

  static async assignRole(guildId: string, userId: string, roleId: string): Promise<{ status: string }> {
    return roleAuthFetch("/role/assign", {
      body: { 
        guild_id: guildId, 
        user_id: userId, 
        role_id: roleId 
      }
    });
  }

  static async removeRoleFromMember(guildId: string, userId: string, roleId: string): Promise<{ status: string }> {
    return roleAuthFetch("/role/remove", {
      body: { 
        guild_id: guildId, 
        user_id: userId, 
        role_id: roleId 
      }
    });
  }

  static async deleteRole(guildId: string, roleId: string): Promise<{ status: string }> {
    return roleAuthFetch("/role/delete", {
      body: { 
        guild_id: guildId, 
        role_id: roleId 
      }
    });
  }

  // Permissions
  static async checkPermission(userId: string, guildId: string, relation: string): Promise<PermissionCheckResponse> {
    return roleAuthFetch("/permission/check", {
      body: { 
        user_id: userId, 
        guild_id: guildId, 
        relation 
      }
    });
  }

  static async checkRolePermissions(guildId: string, roleId: string, relation: string): Promise<RolePermissionCheckResponse> {
    return roleAuthFetch("/role/permission_check", {
      body: { 
        role_id: roleId, 
        relation: relation, 
        guild_id: guildId, 
      }
    });
  }
}