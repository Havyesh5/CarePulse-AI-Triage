import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import { after, before, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import app from "../src/app.ts";
import { db, pool, usersTable } from "@workspace/db";

type RegisterResponse = {
  token: string;
  user: { id: number };
};

let server: Server;
let baseUrl: string;
const createdUserIds: number[] = [];

before(async () => {
  server = createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Test server did not expose a TCP address");
  }
  baseUrl = `http://127.0.0.1:${address.port}/api`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

  for (const userId of createdUserIds) {
    await db.delete(usersTable).where(eq(usersTable.id, userId));
  }
  await pool.end();
});

async function request(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init?.headers,
    },
  });
}

async function register(name: string): Promise<RegisterResponse> {
  const response = await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name,
      email: `${name.toLowerCase().replaceAll(" ", "-")}-${randomUUID()}@example.test`,
      password: "test-password-123",
    }),
  });
  assert.equal(response.status, 201);
  const result = (await response.json()) as RegisterResponse;
  createdUserIds.push(result.user.id);
  return result;
}

describe("assessment ownership", () => {
  test("does not let one user read another user's assessment", async () => {
    const owner = await register("Assessment Owner");
    const otherUser = await register("Different User");

    const createResponse = await request("/assessments", {
      method: "POST",
      headers: { authorization: `Bearer ${owner.token}` },
      body: JSON.stringify({
        age: 42,
        biologicalSex: "unspecified",
        primarySymptoms: "chest pain",
        duration: "ten minutes",
        severity: 8,
      }),
    });
    assert.equal(createResponse.status, 201);
    const assessment = (await createResponse.json()) as { id: number; urgencyLevel: string };
    assert.equal(assessment.urgencyLevel, "EMERGENCY_IMMEDIATE_CARE");

    const detailResponse = await request(`/assessments/${assessment.id}`, {
      headers: { authorization: `Bearer ${otherUser.token}` },
    });
    assert.equal(detailResponse.status, 404);
    assert.deepEqual(await detailResponse.json(), { error: "Assessment not found" });

    const listResponse = await request("/assessments", {
      headers: { authorization: `Bearer ${otherUser.token}` },
    });
    assert.equal(listResponse.status, 200);
    assert.deepEqual(await listResponse.json(), []);
  });
});