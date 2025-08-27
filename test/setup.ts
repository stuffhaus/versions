import { expect } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";
import { vi } from "vitest";

expect.extend(matchers);

vi.mock("server-only", () => ({}));

vi.mock("@stackframe/stack", () => ({
  StackServerApp: vi.fn(() => ({
    getUser: vi.fn(),
  })),
  StackProvider: ({ children }: { children: React.ReactNode }) => children,
  StackTheme: ({ children }: { children: React.ReactNode }) => children,
  UserButton: () => null,
}));

vi.mock("@/stack", () => ({
  stackServerApp: {
    getUser: vi.fn(),
  },
}));

vi.mock("@/lib/database", () => ({
  database: {
    $count: vi.fn(),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(),
    })),
  },
}));

vi.mock("swr", () => ({
  default: vi.fn(),
}));
