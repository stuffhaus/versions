import { expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";
import {
  setupTestDatabase,
  teardownTestDatabase,
  clearTestDatabase,
} from "./test-db";

expect.extend(matchers);

beforeAll(() => setupTestDatabase());
beforeEach(() => clearTestDatabase());
afterAll(() => teardownTestDatabase());

vi.mock("server-only", () => ({}));
vi.mock("swr", () => ({ default: vi.fn() }));

vi.mock("@stackframe/stack", () => ({
  StackServerApp: vi.fn(() => ({ getUser: vi.fn() })),
  StackProvider: ({ children }: { children: React.ReactNode }) => children,
  StackTheme: ({ children }: { children: React.ReactNode }) => children,
  UserButton: () => null,
}));

vi.mock("@/stack", () => ({
  stackServerApp: { getUser: vi.fn() },
}));

vi.mock("@/lib/database", async () => {
  const { getTestDatabase } = await import("./test-db");
  return {
    get database() {
      return getTestDatabase();
    },
  };
});
