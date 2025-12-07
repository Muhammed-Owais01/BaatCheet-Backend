import { RoleAuthClient } from "../src/api/services/role-auth";

type User = { userId: string; username: string };
type CreatedGuild = { guildId: string; owner: User };

// Helper functions for user and guild management
async function createUser(username: string): Promise<User> {
  const userId = `${username}_${Date.now()}`;
  await RoleAuthClient.createUser(userId);
  return { userId, username };
}

async function createGuild(ownerId: string, guildName: string): Promise<{ guildId: string }> {
  const guildId = `${guildName}_${Date.now()}`;
  await RoleAuthClient.createGuild(guildId, ownerId);
  return { guildId };
}

async function createRole(guildId: string, roleName: string, permissions: string[] = []) {
  const roleId = `${guildId}_${roleName}_${Date.now()}`;
  await RoleAuthClient.createRole(guildId, roleId, permissions);
  return { roleId, roleName };
}

async function addMember(guildId: string, userId: string, roleId: string) {
  await RoleAuthClient.addMember(guildId, userId, roleId);
}

async function assignRole(guildId: string, userId: string, roleId: string) {
  await RoleAuthClient.assignRole(guildId, userId, roleId);
}

async function deleteGuild(guildId: string) {
  await RoleAuthClient.deleteGuild(guildId);
}

async function checkPermission(userId: string, guildId: string, relation: string): Promise<boolean> {
  const result = await RoleAuthClient.checkPermission(userId, guildId, relation);
  return result.allowed === true;
}

async function createRoleAsOwner(ctx: TestContext, guildId: string, userId: string, roleName: string, permissions: string[] = []) {
  const roleId = `${guildId}_${roleName}_${Date.now()}`;
  await RoleAuthClient.createRole(guildId, roleId, permissions);
  // Store role mapping for later use
  if (!ctx.roleMap[guildId]) ctx.roleMap[guildId] = {};
  ctx.roleMap[guildId][roleName] = roleId;
  return { roleId, roleName };
}

async function addMembers(ctx: TestContext, guildId: string, userKey: string, memberKey: string) {
  const member = ctx.users[memberKey];
  // Get default member role for this guild
  const defaultRoleId = ctx.roleMap[guildId]?.['@member'] || `${guildId}_member_default`;
  await RoleAuthClient.addMember(guildId, member.userId, defaultRoleId);
}

async function assignRoleAsOwner(ctx: TestContext, guildId: string, userKey: string, memberKey: string, roleName: string) {
  const member = ctx.users[memberKey];
  const roleId = ctx.roleMap[guildId][roleName];
  if (!roleId) throw new Error(`Role ${roleName} not found in guild ${guildId}`);
  await RoleAuthClient.assignRole(guildId, member.userId, roleId);
}

async function removeRoleFromMember(ctx: TestContext, guildId: string, userKey: string, memberKey: string, roleName: string) {
  const member = ctx.users[memberKey];
  const roleId = ctx.roleMap[guildId][roleName];
  if (!roleId) throw new Error(`Role ${roleName} not found in guild ${guildId}`);
  await RoleAuthClient.removeRoleFromMember(guildId, member.userId, roleId);
}

async function changeOwner(ctx: TestContext, guildId: string, userKey: string, newOwnerKey: string) {
  const newOwner = ctx.users[newOwnerKey];
  await RoleAuthClient.changeOwner(guildId, newOwner.userId);
}

type TestContext = {
  users: Record<string, User>;
  roleMap: Record<string, Record<string, string>>; // guildId -> roleName -> roleId mapping
  createdRoleNames: string[];
};

type TestCase = {
  id: number;
  actorKey: string;
  relation: string;
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

  // Moderator cases
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
      await assignRoleAsOwner(ctx, guildIds['A'], 'A', 'C', 'Admin');
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
      await createRoleAsOwner(ctx, guildIds['A'], 'A', 'Helper', ['can_message']);
      ctx.createdRoleNames.push('Helper');
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
      await createRoleAsOwner(ctx, guildIds['A'], 'A', 'EventManager', ['can_add_members']);
      ctx.createdRoleNames.push('EventManager');
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
      await createRoleAsOwner(ctx, guildIds['A'], 'A', 'SpecialRole', ['can_manage_roles']);
      ctx.createdRoleNames.push('SpecialRole');
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
      await createRoleAsOwner(ctx, guildIds['A'], 'A', 'RoleA', ['can_manage_roles']);
      ctx.createdRoleNames.push('RoleA');
      await createRoleAsOwner(ctx, guildIds['A'], 'A', 'RoleB', ['can_manage_permissions']);
      ctx.createdRoleNames.push('RoleB');
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
    },
  },
  {
    id: 19,
    actorKey: 'M',
    relation: 'can_message',
    expected: false,
    description: 'Moderator in different guild cannot message',
    prepare: async (ctx, guildIds) => {
      await addMembers(ctx, guildIds['H'], 'H', 'M');
      await createRoleAsOwner(ctx, guildIds['H'], 'H', 'Admin', ['moderator']);
      ctx.createdRoleNames.push('Admin');
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
      await assignRoleAsOwner(ctx, guildIds['H'], 'H', 'O', 'Admin');
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
  const createdGuilds: CreatedGuild[] = [];

  async function cleanup() {
    console.log('Cleaning up created guilds...');
    for (const g of createdGuilds) {
      try {
        await deleteGuild(g.guildId);
      } catch (err) {
        console.error('cleanup deleteGuild failed', err);
      }
    }
    console.log('Guild cleanup complete.');
  }

  try {
    // Reset database at start
    console.log('Resetting RoleAuth database...');
    await RoleAuthClient.resetDatabase();
    console.log('Database reset complete.');

    const users: Record<string, User> = {
      A: await createUser('a'),
      B: await createUser('b'),
      C: await createUser('c'),
      D: await createUser('d'),
      E: await createUser('e'),
      F: await createUser('f'),
      G: await createUser('g'),
      H: await createUser('h'),
      I: await createUser('i'),
      J: await createUser('j'),
      K: await createUser('k'),
      L: await createUser('l'),
      M: await createUser('m'),
      N: await createUser('n'),
      O: await createUser('o'),
      S: await createUser('s'),
    };

    console.log("Created users:", Object.values(users).map(u => u.username).join(', '));

    const guildResp = await createGuild(users.A.userId, 'Test_Guild_1');
    const guildId = guildResp.guildId;
    const guildResp2 = await createGuild(users.H.userId, 'Test_Guild_2');
    createdGuilds.push({ guildId, owner: users.A });
    console.log(`Created guild '${guildId}' owned by ${users.A.username}`);
    createdGuilds.push({ guildId: guildResp2.guildId, owner: users.H });
    console.log(`Created guild '${guildResp2.guildId}' owned by ${users.H.username}`);

    // Initialize context
    const ctx: TestContext = {
      users,
      roleMap: {
        [guildId]: {},
        [guildResp2.guildId]: {},
      },
      createdRoleNames: [],
    };

    // Create default member roles for guilds
    const defaultRoleA = `${guildId}_member_default`;
    await RoleAuthClient.createRole(guildId, defaultRoleA, ['can_message']);
    ctx.roleMap[guildId]['@member'] = defaultRoleA;

    const defaultRoleH = `${guildResp2.guildId}_member_default`;
    await RoleAuthClient.createRole(guildResp2.guildId, defaultRoleH, ['can_message']);
    ctx.roleMap[guildResp2.guildId]['@member'] = defaultRoleH;

    // Ensure a user exists in the users map
    async function ensureUserExists(usersMap: Record<string, User>, key: string) {
      if (usersMap[key]) return usersMap[key];
      const uname = `user_${key.toLowerCase()}`;
      const u = await createUser(uname);
      usersMap[key] = u;
      return u;
    }

    // Run declarative testCases sequentially
    for (const tc of testCases) {
      console.log(`Running TC${tc.id}: ${tc.description ?? tc.relation} (actor ${tc.actorKey})`);

      // Ensure actor exists
      await ensureUserExists(ctx.users, tc.actorKey);

      // Run prepare
      if (tc.prepare) {
        try {
          await tc.prepare(ctx, { A: guildId, H: guildResp2.guildId });
        } catch (err) {
          console.error(`TC${tc.id} prepare failed:`, err);
          throw err;
        }
      }

      // Run the RoleAuth permission check
      const actor = ctx.users[tc.actorKey];
      if (!actor) throw new Error(`TC${tc.id} missing actor user for key ${tc.actorKey}`);

      const allowed = await checkPermission(actor.userId, guildId, tc.relation);
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
        console.log('Attempting cleanup after failure...');
        await cleanup();
      })();
    } catch (e) {
      console.error('Cleanup failed', e);
    }
    process.exit(1);
  }
}

run();