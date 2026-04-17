import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  isEmailAllowed,
  normalizeEmail,
  readAdminContact,
  readAllowList,
} from "../src/lib/email-allow-list";

const ORIGINAL_ALLOWED = process.env.ALLOWED_EMAILS;
const ORIGINAL_CONTACT = process.env.POOL_ADMIN_CONTACT;

describe("email-allow-list", () => {
  beforeEach(() => {
    delete process.env.ALLOWED_EMAILS;
    delete process.env.POOL_ADMIN_CONTACT;
  });

  afterEach(() => {
    process.env.ALLOWED_EMAILS = ORIGINAL_ALLOWED;
    process.env.POOL_ADMIN_CONTACT = ORIGINAL_CONTACT;
  });

  it("normalizes emails (trim + lowercase)", () => {
    expect(normalizeEmail(" Foo@Bar.COM ")).toBe("foo@bar.com");
    expect(normalizeEmail("x@y.z")).toBe("x@y.z");
  });

  it("parses ALLOWED_EMAILS, ignoring whitespace and blanks", () => {
    process.env.ALLOWED_EMAILS = "  Alice@X.com, bob@y.com ,,  ";
    const set = readAllowList();
    expect(set.has("alice@x.com")).toBe(true);
    expect(set.has("bob@y.com")).toBe(true);
    expect(set.size).toBe(2);
  });

  it("treats empty allow-list as open mode", () => {
    process.env.ALLOWED_EMAILS = "";
    expect(isEmailAllowed("anyone@example.com")).toBe(true);
  });

  it("treats a missing allow-list env var as open mode", () => {
    delete process.env.ALLOWED_EMAILS;
    expect(isEmailAllowed("anyone@example.com")).toBe(true);
  });

  it("rejects emails not on the configured list", () => {
    process.env.ALLOWED_EMAILS = "friend@x.com";
    expect(isEmailAllowed("stranger@x.com")).toBe(false);
  });

  it("accepts emails on the list regardless of case/whitespace", () => {
    process.env.ALLOWED_EMAILS = "friend@x.com";
    expect(isEmailAllowed("FRIEND@x.com")).toBe(true);
    expect(isEmailAllowed("  friend@x.com  ")).toBe(true);
  });

  it("rejects null / empty / whitespace-only inputs", () => {
    process.env.ALLOWED_EMAILS = "friend@x.com";
    expect(isEmailAllowed(null)).toBe(false);
    expect(isEmailAllowed(undefined)).toBe(false);
    expect(isEmailAllowed("")).toBe(false);
    expect(isEmailAllowed("   ")).toBe(false);
  });

  it("reads admin contact when set; null otherwise", () => {
    expect(readAdminContact()).toBeNull();
    process.env.POOL_ADMIN_CONTACT = "admin@example.com";
    expect(readAdminContact()).toBe("admin@example.com");
    process.env.POOL_ADMIN_CONTACT = "  ";
    expect(readAdminContact()).toBeNull();
  });
});
