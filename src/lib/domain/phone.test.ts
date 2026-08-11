import { describe, expect, it } from "vitest";
import { e164Phone, formatPhone, googleVoiceCallUrl } from "./phone";

describe("phone helpers", () => {
  it.each([
    ["(503) 555-0148", "+15035550148"],
    ["503.555.0148", "+15035550148"],
    ["+1 503 555 0148", "+15035550148"],
    ["15035550148", "+15035550148"],
    ["+44 20 7946 0958", "+442079460958"],
  ])("normalizes %s", (input, expected) => {
    expect(e164Phone(input)).toBe(expected);
  });

  it.each(["555-0148 x22", "abc", "", "   "])("rejects %s", (input) => {
    expect(e164Phone(input)).toBeNull();
  });

  it("formats US E.164 numbers and falls back for invalid values", () => {
    expect(formatPhone("+15035550148")).toBe("(503) 555-0148");
    expect(formatPhone("+44 20 7946 0958")).toBe("+442079460958");
    expect(formatPhone("555-0148 x22")).toBe("555-0148 x22");
    expect(formatPhone("abc")).toBe("abc");
    expect(formatPhone("")).toBeNull();
  });

  it("builds Google Voice call links without account-pinning paths", () => {
    expect(googleVoiceCallUrl("+15035550148", "sam@greenroomcannabis.com")).toBe("https://voice.google.com/calls?a=nc,%2B15035550148&authuser=sam%40greenroomcannabis.com");
    expect(googleVoiceCallUrl("+15035550148", null)).toBe("https://voice.google.com/calls?a=nc,%2B15035550148");
  });
});
