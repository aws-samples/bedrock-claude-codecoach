import { beforeEach, expect, it, vi } from "vitest";
const send = vi.hoisted(() => vi.fn());
vi.mock("@aws-sdk/client-dynamodb", async (importOriginal) => {
  const original = await importOriginal<typeof import("@aws-sdk/client-dynamodb")>();
  return { ...original, DynamoDBClient: class { send = send; } };
});
import { QuerySignUsers, QueryPromptByPK, UpdateUser, CreatePrompt, ReadSession, DeleteSession } from "@utils/ddb";
import { verifyPassword } from "@utils/password";

beforeEach(() => { send.mockReset(); send.mockResolvedValue({ Items: [] }); });

it("reads only account records with a consistent read", async () => {
  await QuerySignUsers("owner@example.test");
  expect(send.mock.calls[0][0].input).toMatchObject({
    ConsistentRead: true,
    KeyConditionExpression: "PK = :value AND SK = :account",
    ExpressionAttributeValues: { ":account": { S: "#ACC" } },
  });
});

it("includes the owner in custom prompt retrieval", async () => {
  await QueryPromptByPK("prompt-id", "owner@example.test");
  expect(send.mock.calls[0][0].input).toMatchObject({
    KeyConditionExpression: "PK = :pk AND SK = :owner",
    ExpressionAttributeValues: { ":owner": { S: "owner@example.test" } },
  });
});

it("updates passwords atomically and creates a new session version", async () => {
  const version = await UpdateUser("owner@example.test", "new strong password", "previous-hash");
  const input = send.mock.calls[0][0].input;
  expect(input.ConditionExpression).toBe("#password = :previous");
  expect(input.ExpressionAttributeValues[":version"].S).toBe(version);
  expect(await verifyPassword("new strong password", input.ExpressionAttributeValues[":password"].S)).toBe(true);
  send.mockRejectedValue(new Error("ConditionalCheckFailed"));
  await expect(UpdateUser("owner@example.test", "new strong password", "stale-hash")).rejects.toThrow();
});

it("does not report successful prompt writes after DynamoDB failures", async () => {
  send.mockRejectedValue(new Error("AccessDenied"));
  await expect(CreatePrompt("owner@example.test", "name", "prompt")).rejects.toThrow("AccessDenied");
});

it("uses matching session keys and consistent reads for immediate revocation", async () => {
  await ReadSession("session-id");
  await DeleteSession("session-id");
  const read = send.mock.calls[0][0].input;
  const remove = send.mock.calls[1][0].input;
  expect(read.ConsistentRead).toBe(true);
  expect(remove.Key).toEqual(read.Key);
});
