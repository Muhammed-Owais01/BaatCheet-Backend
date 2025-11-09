import axios from 'axios';
import env from "@baatcheet/env";
import { fgaClient } from "@baatcheet/auth";

type Account = { userId: string; username: string; password: string; token?: string };
type CreatedGuild = { guildId: string; owner: Account };

const BASE_URL = env.REST_SERVER_BASE || 'http://localhost:4000';
const FGA_API_URL = env.FGA_API_URL!;
const FGA_STORE_ID = env.FGA_STORE_ID_TEST!;
const FGA_API_TOKEN = env.FGA_AUTH_MODEL_ID!;

if (!FGA_API_URL || !FGA_STORE_ID || !FGA_API_TOKEN) {
  console.error('Set FGA_API_URL, FGA_STORE_ID and FGA_API_TOKEN environment variables for test checks.');
  process.exit(1);
}

const http = axios.create({ baseURL: BASE_URL, validateStatus: () => true });

async function createUser(name: string, username: string, password = 'password123') : Promise<Account> {
  const resp = await http.post('/users', { name, username, password });
  if (resp.status !== 201) throw new Error(`createUser failed: ${resp.status} ${JSON.stringify(resp.data)}`);
  const user = resp.data.user;
  return { userId: user.userId, username, password };
}

async function login(a: Account): Promise<string> {
  const resp = await http.post('/users/login', { username: a.username, password: a.password });
  if (resp.status !== 200) throw new Error(`login failed for ${a.username}: ${resp.status} ${JSON.stringify(resp.data)}`);
  const token = resp.data.token as string;
  return token;
}

async function createGuild(token: string, guildName: string): Promise<{ guildId: string }> {
  const resp = await http.post('/guilds', { guildName }, { headers: { Authorization: `Bearer ${token}` } });
  if (resp.status !== 201) throw new Error(`createGuild failed: ${resp.status} ${JSON.stringify(resp.data)}`);
  return resp.data;
}

async function createRole(token: string, guildId: string, roleName: string, permissions: string[] = [], color?: string) {
  const resp = await http.post(`/guilds/${guildId}/roles`, { roleName, permissions, color }, { headers: { Authorization: `Bearer ${token}` } });
  return resp;
}

async function addMember(token: string, guildId: string, memberId: string) {
  const resp = await http.post(`/guilds/${guildId}/members/${memberId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
  return resp;
}

async function assignRole(token: string, guildId: string, memberId: string, roleName: string) {
  const resp = await http.post(`/guilds/${guildId}/members/${memberId}/assign`, { roleName }, { headers: { Authorization: `Bearer ${token}` } });
  return resp;
}

async function deleteGuild(token: string, guildId: string) {
  const resp = await http.delete(`/guilds/${guildId}`, { headers: { Authorization: `Bearer ${token}` } });
  return resp;
}

async function fgaCheck(user: string, relation: string, object: string): Promise<boolean> {
  const res = await fgaClient.check({ user, relation, object });
  return res.allowed === true;
}

async function createRoleAsOwner(ctx: TestContext, guildId: string, userId: string, roleName: string, permissions: string[] = [], color?: string) {
  const owner = ctx.users[userId];
  const resp = await createRole(owner.token!, guildId, roleName, permissions, color);
  return resp.data.role ?? resp.data ?? { roleId: resp.data.roleId ?? resp.data.role?.roleId };
}

async function addMembers(ctx: TestContext, guildId: string, userKey: string, memberKey: string) {
  const owner = ctx.users[userKey];
  const member = ctx.users[memberKey];
  const resp = await addMember(owner.token!, guildId, member.userId);
  return resp.data;
}

async function assignRoleAsOwner(ctx: TestContext, guildId: string, userKey: string, memberKey: string, roleName: string) {
  const owner = ctx.users[userKey];
  const member = ctx.users[memberKey];
  const resp = await assignRole(owner.token!, guildId, member.userId, roleName);
  return resp.data;
}

async function removeRoleFromMember(ctx: TestContext, guildId: string, userKey: string, memberKey: string, roleName: string) {
  const owner = ctx.users[userKey];
  const member = ctx.users[memberKey];
  const resp = await http.request({
    method: 'DELETE',
    url: `/guilds/${guildId}/members/${member.userId}/roles`,
    headers: { Authorization: `Bearer ${owner.token}` },
    data: { roleName },
  });

  return resp;
}

async function changeOwner(ctx: TestContext, guildId: string, userKey: string, newOwnerKey: string) {
  const owner = ctx.users[userKey];
  const newOwner = ctx.users[newOwnerKey];
  const resp = await http.patch(`/guilds/${guildId}/ownership/${newOwner.userId}`, {}, { headers: { Authorization: `Bearer ${owner.token}` } });
  return resp.data;
}

type TestContext = {
  users: Record<string, Account>;
  createdRoleNames: string[]; // track created roles for cleanup/debug
};

type TestCase = {
  id: number;
  actorKey: string; // 'A' .. 'Z' matching users map
  relation: string; // permission to check e.g. 'can_add_members'
  prepare?: (ctx: TestContext, guildIds: Record<string, string>) => Promise<void>;
  expected: boolean;
  description?: string;
};

const testCases: TestCase[] = [
  {
    id: 1,
    actorKey: 'A',
    relation: 'can_change_owner',
    expected: true,
    description: 'Owner can change owner',
  },
  {
    id: 2,
    actorKey: 'A',
    relation: 'can_ban_members',
    expected: true,
    description: 'Owner inherits moderator permissions',
  },
  {
    id: 3,
    actorKey: 'B',
    relation: 'can_message',
    expected: true,
    description: 'Member can message',
    prepare: async (ctx, guildIds) => {
      await addMembers(ctx, guildIds['A'], 'A', 'B');
    },
  },
  {
    id: 4,
    actorKey: 'B',
    relation: 'can_add_members',
    expected: false,
    description: 'Member cannot add members',
  },

  // Moderator cases: implemented by creating & assigning a Moderator role
  {
    id: 5,
    actorKey: 'C',
    relation: 'can_add_members',
    expected: true,
    description: 'Moderator can add members',
    prepare: async (ctx, guildIds) => {
      await addMembers(ctx, guildIds['A'], 'A', 'C');
      await createRoleAsOwner(ctx, guildIds['A'], 'A', 'Admin', ['moderator']);
      ctx.createdRoleNames.push('Admin');
      await assignRoleAsOwner(ctx, guildIds['A'],'A', 'C', 'Admin');
      await addMembers(ctx, guildIds['A'], 'C', 'D');
    },
  },
  {
    id: 6,
    actorKey: 'C',
    relation: 'can_manage_roles',
    expected: true,
    description: 'Moderator can manage roles',
    prepare: async (ctx, guildIds) => {
      await assignRoleAsOwner(ctx, guildIds['A'], 'C', 'D', 'Admin');
    },
  },
  {
    id: 7,
    actorKey: 'C',
    relation: 'can_change_owner',
    expected: false,
    description: 'Moderator cannot change owner',
  },

  // Role-based permissions
  {
    id: 8,
    actorKey: 'D',
    relation: 'can_manage_permissions',
    expected: true,
    description: 'Role grants can_manage_permissions',
    prepare: async (ctx, guildIds) => {
      await addMembers(ctx, guildIds['A'], 'D', 'E');
      await createRoleAsOwner(ctx, guildIds['A'], 'A', 'Kabil', ['can_manage_permissions']);
      ctx.createdRoleNames.push('Kabil');
      await assignRoleAsOwner(ctx, guildIds['A'], 'C', 'D', 'Kabil');
    },
  },
  {
    id: 9,
    actorKey: 'D',
    relation: 'can_ban_members',
    expected: true,
    description: 'Role grants can_ban_members via inheritance',
  },
  {
    id: 10,
    actorKey: 'E',
    relation: 'can_add_members',
    expected: false,
    description: 'Role with no permissions grants nothing',
    prepare: async (ctx, guildIds) => {
      await createRoleAsOwner(ctx, guildIds['A'], 'A', 'Helper', ['can_message']); ctx.createdRoleNames.push('Helper');
      await assignRoleAsOwner(ctx, guildIds['A'], 'D', 'E', 'Helper');
      await addMembers(ctx, guildIds['A'], 'A', 'F');
    },
  },

  // Member + role
  {
    id: 11,
    actorKey: 'F',
    relation: 'can_add_members',
    expected: true,
    description: 'Member + Role grants permission',
    prepare: async (ctx, guildIds) => {
      await createRoleAsOwner(ctx, guildIds['A'], 'A', 'EventManager', ['can_add_members']); ctx.createdRoleNames.push('EventManager');
      await assignRoleAsOwner(ctx, guildIds['A'], 'A', 'F', 'EventManager');
    },
  },
  {
    id: 12,
    actorKey: 'F',
    relation: 'can_ban_members',
    expected: false,
    description: 'Member + Role does not grant ban permissions',
  },

  // Multiple roles
  {
    id: 13,
    actorKey: 'G',
    relation: 'can_manage_roles',
    expected: true,
    description: 'Moderator + Role grants permission (OR logic)',
    prepare: async (ctx, guildIds) => {
      await addMembers(ctx, guildIds['A'], 'A', 'G');
      await createRoleAsOwner(ctx, guildIds['A'], 'A', 'SpecialRole', ['can_manage_roles']); ctx.createdRoleNames.push('SpecialRole');
      await assignRoleAsOwner(ctx, guildIds['A'], 'A', 'G', 'SpecialRole');
      await assignRoleAsOwner(ctx, guildIds['A'], 'A', 'G', 'Admin');
    },
  },

  // Ownership override
  {
    id: 14,
    actorKey: 'H',
    relation: 'can_manage_channels',
    expected: true,
    description: 'Owner + Role: owner privileges override role',
    prepare: async (ctx, guildIds) => {
      await addMembers(ctx, guildIds['A'], 'A', 'H');
      await changeOwner(ctx, guildIds['A'], 'A', 'H');
    },
  },

  // Edge / negative cases
  {
    id: 15,
    actorKey: 'I',
    relation: 'can_manage_permissions',
    expected: false,
    description: 'Member cannot manage permissions',
    prepare: async (ctx, guildIds) => {
      await addMembers(ctx, guildIds['A'], 'A', 'I');
    },
  },
  {
    id: 16,
    actorKey: 'J',
    relation: 'can_ban_members',
    expected: true,
    description: 'Moderator can ban via inheritance chain',
    prepare: async (ctx, guildIds) => {
      await changeOwner(ctx, guildIds['A'], 'H', 'A');
      await addMembers(ctx, guildIds['A'], 'A', 'J');
      await assignRoleAsOwner(ctx, guildIds['A'], 'A', 'J', 'Admin');
    },
  },

  {
    id: 17,
    actorKey: 'K',
    relation: 'can_ban_members',
    expected: true,
    description: 'Multiple roles cumulative permission',
    prepare: async (ctx, guildIds) => {
      await addMembers(ctx, guildIds['A'], 'A', 'K');
      await createRoleAsOwner(ctx, guildIds['A'], 'A', 'RoleA', ['can_manage_roles']); ctx.createdRoleNames.push('RoleA');
      await createRoleAsOwner(ctx, guildIds['A'], 'A', 'RoleB', ['can_manage_permissions']); ctx.createdRoleNames.push('RoleB');
      await assignRoleAsOwner(ctx, guildIds['A'], 'A', 'K', 'RoleA');
      await assignRoleAsOwner(ctx, guildIds['A'], 'A', 'K', 'RoleB');
    },
  },

  // Member role only
  {
    id: 18,
    actorKey: 'L',
    relation: 'can_message',
    expected: true,
    description: 'User with member role can message',
    prepare: async (ctx, guildIds) => {
      await addMembers(ctx, guildIds['A'], 'A', 'L');
    }
  },
  {
    id: 19,
    actorKey: 'M',
    relation: 'can_message',
    expected: false,
    description: 'Moderator can always message',
    prepare: async (ctx, guildIds) => {
      await addMembers(ctx, guildIds['H'], 'H', 'M');
      await createRoleAsOwner(ctx, guildIds['H'], 'H', 'Admin', ['moderator']); ctx.createdRoleNames.push('Admin');
      await assignRoleAsOwner(ctx, guildIds['H'], 'H', 'M', 'Admin');
    },
  },
  {
    id: 20,
    actorKey: 'N',
    relation: 'can_manage_roles',
    expected: false,
    description: 'Member cannot manage roles',
    prepare: async (ctx, guildIds) => {
      await addMembers(ctx, guildIds['A'], 'A', 'N');
    },
  },

  // Guild isolation 
  {
    id: 21,
    actorKey: 'O',
    relation: 'can_add_members',
    expected: false,
    description: 'Role in wrong guild does not grant permissions',
    prepare: async (ctx, guildIds) => {
      await addMembers(ctx, guildIds['H'], 'H', 'O');
      await assignRoleAsOwner(ctx, guildIds['H'], 'H', 'O', 'Admin'); // Admin role exists in guild H but not A
    },
  },

  {
    id: 26,
    actorKey: 'S',
    relation: 'can_add_members',
    expected: false,
    description: 'Moderator demoted to member loses permission',
    prepare: async (ctx, guildIds) => {
      await addMembers(ctx, guildIds['A'], 'A', 'S');
      await assignRoleAsOwner(ctx, guildIds['A'], 'A', 'S', 'Admin');
      await removeRoleFromMember(ctx, guildIds['A'], 'A', 'S', 'Admin');
    },
  },
];

/* Test runner */
async function run() {
  const createdUsers: Account[] = [];
  const createdGuilds: CreatedGuild[] = [];

  async function cleanup() {
    console.log('Cleaning up created guilds...');
    for (const g of createdGuilds) {
      try {
        const token = g.owner.token!;
        await deleteGuild(token, g.guildId);
      } catch (err) {
        console.error('cleanup deleteGuild failed', err);
      }
    }
    console.log('Guild Cleanup complete.');
  }

  try {
    const users = {
      A: await createUser('User A', 'user_a'),
      B: await createUser('User B', 'user_b'),
      C: await createUser('User C', 'user_c'),
      D: await createUser('User D', 'user_d'),
      E: await createUser('User E', 'user_e'),
      F: await createUser('User F', 'user_f'),
      G: await createUser('User G', 'user_g'),
      H: await createUser('User H', 'user_h'),
      I: await createUser('User I', 'user_i'),
      J: await createUser('User J', 'user_j'),
      K: await createUser('User K', 'user_k'),
      L: await createUser('User L', 'user_l'),
      M: await createUser('User M', 'user_m'),
      N: await createUser('User N', 'user_n'),
      O: await createUser('User O', 'user_o'),
      S: await createUser('User S', 'user_s'),
    };

    console.log("Created users:", Object.values(users).map(u => u.username).join(', '));
    for (const k of Object.keys(users)) {
      const a = users[k as keyof typeof users];
      a.token = await login(a);
      createdUsers.push(a);
    }
    console.log('All users logged in.');

    const guildResp = await createGuild(users.A.token!, 'Test Guild 1');
    const guildId = guildResp.guildId;
    const guildResp2 = await createGuild(users.B.token!, 'Test Guild 2');
    createdGuilds.push({ guildId, owner: users.A });
    console.log(`Created guild '${guildId}' owned by ${users.A.username}`);
    createdGuilds.push({ guildId: guildResp2.guildId, owner: users.B });
    console.log(`Created guild '${guildResp2.guildId}' owned by ${users.B.username}`);

    // ensure a user exists in the users map
    async function ensureUserExists(usersMap: Record<string, Account>, key: string) {
      if (usersMap[key]) return usersMap[key];
      const uname = `user_${key.toLowerCase()}`;
      const u = await createUser(`User ${key}`, uname);
      u.token = await login(u);
      usersMap[key] = u;
      createdUsers.push(u);
      return u;
    }

    const ctx: TestContext = { users: users as any, createdRoleNames: [] };

    // Run declarative testCases sequentially
    for (const tc of testCases) {
      console.log(`Running TC${tc.id}: ${tc.description ?? tc.relation} (actor ${tc.actorKey})`);

      // ensure actor exists
      await ensureUserExists(ctx.users, tc.actorKey);

      // run prepare
      if (tc.prepare) {
        try {
          await tc.prepare(ctx, { A: guildId, B: guildResp2.guildId });
        } catch (err) {
          console.error(`TC${tc.id} prepare failed:`, err);
          throw err;
        }
      }

      // run the OpenFGA check
      const actor = ctx.users[tc.actorKey];
      if (!actor) throw new Error(`TC${tc.id} missing actor user for key ${tc.actorKey}`);

      const allowed = await fgaCheck(`user:${actor.userId}`, tc.relation, `guild:${guildId}`);
      console.log(`TC${tc.id} result: allowed=${allowed} expected=${tc.expected}`);

      if (allowed !== tc.expected) {
        throw new Error(`TC${tc.id} FAILED: actor=${tc.actorKey} relation=${tc.relation} expected=${tc.expected} got=${allowed}`);
      }
    }

    console.log('All declarative testCases passed (or reached end). Proceeding to cleanup.');

    await cleanup();
    console.log('All done, cleaned up.');
  } catch (err) {
    console.error('Test runner error:', err);
    try {
      await (async () => {
        // attempt cleanup
        console.log('Attempting cleanup after failure...');
        await cleanup();
        // you can call cleanup here if createdGuilds captured
      })();
    } catch (e) {
      console.error('Cleanup failed', e);
    }
    process.exit(1);
  }
}

run();