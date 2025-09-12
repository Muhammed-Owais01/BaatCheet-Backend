import { prismaClient, type User } from "@baatcheet/db";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import { Creation } from "../types/utils";

const SALT = 10;

export class UserDAO {
  static async create({
    name,
    username,
    password,
  }: Creation<User, "userId">): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, SALT);

    const [result] = await prismaClient.$queryRaw<User[]>`
      INSERT INTO "public"."users" ("userId", name, username, password, "createdAt", "updatedAt")
      VALUES (${randomUUID()}, ${name}, ${username}, ${hashedPassword}, NOW(), NOW())
      RETURNING *;
    `;
    return result;
  }

  // find a user by id
  static async findById(userId: string): Promise<User | null> {
    const [result] = await prismaClient.$queryRaw<User[]>`
      SELECT * FROM "public"."users" WHERE "userId" = ${userId} LIMIT 1;
    `;
    return result ?? null;
  }

  static async findByUsername(username: string): Promise<User | null> {
    const [result] = await prismaClient.$queryRaw<User[]>`
      SELECT * FROM "public"."users" WHERE "username" = ${username} LIMIT 1;
    `;
    return result ?? null;
  }

  // find all users
  static async findAll() {
    return prismaClient.$queryRaw<Omit<User, "password">[]>`
      SELECT u."userId", u.name, u.username, u."createdAt", u."updatedAt"
      FROM "public"."users" u
      ORDER BY "createdAt" DESC;
    `;
  }

  // update user by id
  static async update(
    userId: string,
    data: Partial<Omit<User, "userId" | "createdAt" | "updatedAt">>
  ): Promise<User | null> {
    // build dynamic set clause
    const sets: string[] = [];
    const values: any[] = [];

    Object.entries(data).forEach(([key, value], i) => {
      sets.push(`"${key}" = $${i + 2}`); // $1 reserved for userId
      values.push(value);
    });

    if (sets.length === 0) return this.findById(userId);

    const query = `-- sql
      UPDATE "public"."users"
      SET ${sets.join(", ")}, "updatedAt" = NOW()
      WHERE "userId" = $1
      RETURNING *;
    `;

    const [result] = await prismaClient.$queryRawUnsafe<User[]>(query, userId, ...values);
    return result ?? null;
  }

  // delete user by id
  static async delete(userId: string): Promise<User | null> {
    const [result] = await prismaClient.$queryRaw<User[]>`
      DELETE FROM "public"."users" WHERE "userId" = ${userId}
      RETURNING *;
    `;
    return result ?? null;
  }
}

export default UserDAO;
