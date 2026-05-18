import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("jose", () => ({
  SignJWT: vi.fn(),
  jwtVerify: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

import { createSession, getSession } from "@/lib/auth";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

const mockSignInstance = {
  setProtectedHeader: vi.fn().mockReturnThis(),
  setExpirationTime: vi.fn().mockReturnThis(),
  setIssuedAt: vi.fn().mockReturnThis(),
  sign: vi.fn().mockResolvedValue("mock-jwt-token"),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(cookies).mockResolvedValue(mockCookieStore as never);
  vi.mocked(SignJWT).mockImplementation(() => mockSignInstance as never);
});

describe("createSession", () => {
  test("creates a JWT with the userId and email in the payload", async () => {
    await createSession("user-123", "test@example.com");

    expect(SignJWT).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-123", email: "test@example.com" })
    );
  });

  test("includes an expiresAt ~7 days from now in the JWT payload", async () => {
    const before = Date.now();
    await createSession("user-123", "test@example.com");
    const after = Date.now();

    const payload = vi.mocked(SignJWT).mock.calls[0][0] as Record<string, unknown>;
    const expiresAt = new Date(payload.expiresAt as string).getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    expect(expiresAt).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
    expect(expiresAt).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
  });

  test("signs the JWT with HS256 algorithm", async () => {
    await createSession("user-123", "test@example.com");

    expect(mockSignInstance.setProtectedHeader).toHaveBeenCalledWith({ alg: "HS256" });
  });

  test("sets JWT expiration to 7 days", async () => {
    await createSession("user-123", "test@example.com");

    expect(mockSignInstance.setExpirationTime).toHaveBeenCalledWith("7d");
  });

  test("sets issuedAt on the JWT", async () => {
    await createSession("user-123", "test@example.com");

    expect(mockSignInstance.setIssuedAt).toHaveBeenCalled();
  });

  test("signs with the JWT_SECRET key as a Uint8Array", async () => {
    await createSession("user-123", "test@example.com");

    const signArg = mockSignInstance.sign.mock.calls[0][0];
    expect(ArrayBuffer.isView(signArg)).toBe(true);
    expect(signArg.constructor.name).toBe("Uint8Array");
  });

  test("sets the auth-token cookie with the signed token", async () => {
    await createSession("user-123", "test@example.com");

    expect(mockCookieStore.set).toHaveBeenCalledWith(
      "auth-token",
      "mock-jwt-token",
      expect.any(Object)
    );
  });

  test("sets cookie as httpOnly", async () => {
    await createSession("user-123", "test@example.com");

    const [, , options] = mockCookieStore.set.mock.calls[0];
    expect(options.httpOnly).toBe(true);
  });

  test("sets cookie sameSite to lax", async () => {
    await createSession("user-123", "test@example.com");

    const [, , options] = mockCookieStore.set.mock.calls[0];
    expect(options.sameSite).toBe("lax");
  });

  test("sets cookie path to /", async () => {
    await createSession("user-123", "test@example.com");

    const [, , options] = mockCookieStore.set.mock.calls[0];
    expect(options.path).toBe("/");
  });

  test("sets cookie secure to false outside production", async () => {
    vi.stubEnv("NODE_ENV", "test");
    await createSession("user-123", "test@example.com");

    const [, , options] = mockCookieStore.set.mock.calls[0];
    expect(options.secure).toBe(false);
    vi.unstubAllEnvs();
  });

  test("sets cookie secure to true in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await createSession("user-123", "test@example.com");

    const [, , options] = mockCookieStore.set.mock.calls[0];
    expect(options.secure).toBe(true);
    vi.unstubAllEnvs();
  });

  test("cookie expiry matches the payload expiresAt", async () => {
    const before = Date.now();
    await createSession("user-123", "test@example.com");
    const after = Date.now();

    const payload = vi.mocked(SignJWT).mock.calls[0][0] as Record<string, unknown>;
    const payloadExpiry = new Date(payload.expiresAt as string).getTime();
    const [, , options] = mockCookieStore.set.mock.calls[0];
    const cookieExpiry = options.expires.getTime();

    expect(cookieExpiry).toBe(payloadExpiry);

    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(cookieExpiry).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
    expect(cookieExpiry).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
  });
});

describe("getSession", () => {
  test("returns null when the auth-token cookie is absent", async () => {
    mockCookieStore.get.mockReturnValue(undefined);

    const session = await getSession();

    expect(session).toBeNull();
    expect(jwtVerify).not.toHaveBeenCalled();
  });

  test("returns null when the cookie has no value", async () => {
    mockCookieStore.get.mockReturnValue({ value: undefined });

    const session = await getSession();

    expect(session).toBeNull();
    expect(jwtVerify).not.toHaveBeenCalled();
  });

  test("calls jwtVerify with the token and a Uint8Array key", async () => {
    mockCookieStore.get.mockReturnValue({ value: "valid-token" });
    vi.mocked(jwtVerify).mockResolvedValue({ payload: {} } as never);

    await getSession();

    const [token, key] = vi.mocked(jwtVerify).mock.calls[0];
    expect(token).toBe("valid-token");
    expect(ArrayBuffer.isView(key)).toBe(true);
    expect(key.constructor.name).toBe("Uint8Array");
  });

  test("returns the verified payload as the session", async () => {
    const payload = { userId: "user-123", email: "test@example.com", expiresAt: new Date() };
    mockCookieStore.get.mockReturnValue({ value: "valid-token" });
    vi.mocked(jwtVerify).mockResolvedValue({ payload } as never);

    const session = await getSession();

    expect(session).toEqual(payload);
  });

  test("returns null when jwtVerify throws (invalid token)", async () => {
    mockCookieStore.get.mockReturnValue({ value: "invalid-token" });
    vi.mocked(jwtVerify).mockRejectedValue(new Error("invalid signature"));

    const session = await getSession();

    expect(session).toBeNull();
  });

  test("returns null when jwtVerify throws (expired token)", async () => {
    mockCookieStore.get.mockReturnValue({ value: "expired-token" });
    vi.mocked(jwtVerify).mockRejectedValue(new Error("JWTExpired"));

    const session = await getSession();

    expect(session).toBeNull();
  });
});
