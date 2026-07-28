import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockClient } = vi.hoisted(() => ({
  mockClient: {
    connect: vi.fn(),
    query: vi.fn(),
    end: vi.fn(),
  },
}));

vi.mock("pg", () => ({
  Client: vi.fn(() => mockClient),
}));

import { Client } from "pg";
import { probeDatabase } from "../../app/api/health/db-probe";

describe("probeDatabase (M0 #20 framework-independent database probe)", () => {
  const ctor = Client as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockClient.connect.mockReset();
    mockClient.query.mockReset();
    mockClient.end.mockReset();
    ctor.mockClear();
  });

  it("returns false without constructing a client when the URL is empty", async () => {
    expect(await probeDatabase("")).toBe(false);
    expect(ctor).not.toHaveBeenCalled();
  });

  it("connects, runs SELECT 1, closes the client, and returns true on success", async () => {
    mockClient.connect.mockResolvedValue(undefined);
    mockClient.query.mockResolvedValue({ rows: [{ "?column?": 1 }] });
    mockClient.end.mockResolvedValue(undefined);

    expect(await probeDatabase("postgres://u:p@h:5432/db")).toBe(true);
    expect(mockClient.connect).toHaveBeenCalledTimes(1);
    expect(mockClient.query).toHaveBeenCalledWith("SELECT 1");
    expect(mockClient.end).toHaveBeenCalledTimes(1);
  });

  it("returns false and still closes the client when the query fails (query/statement timeout)", async () => {
    mockClient.connect.mockResolvedValue(undefined);
    mockClient.query.mockRejectedValue(new Error("query timeout"));
    mockClient.end.mockResolvedValue(undefined);

    expect(await probeDatabase("postgres://u:p@h:5432/db")).toBe(false);
    expect(mockClient.end).toHaveBeenCalledTimes(1);
  });

  it("returns false and still closes the client when the connection fails", async () => {
    mockClient.connect.mockRejectedValue(new Error("connect timeout"));
    mockClient.end.mockResolvedValue(undefined);

    expect(await probeDatabase("postgres://u:p@h:5432/db")).toBe(false);
    expect(mockClient.end).toHaveBeenCalledTimes(1);
  });

  it("configures connection, query, and statement timeouts on the pg client", async () => {
    mockClient.connect.mockResolvedValue(undefined);
    mockClient.query.mockResolvedValue({ rows: [{}] });
    mockClient.end.mockResolvedValue(undefined);

    await probeDatabase("postgres://u:p@h:5432/db");
    expect(ctor).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionTimeoutMillis: 2000,
        query_timeout: 2000,
        options: expect.stringContaining("statement_timeout=2000"),
      }),
    );
  });
});