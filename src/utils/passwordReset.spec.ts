import {
  generateResetCode,
  validatePasswordPolicy,
  compareResetCode,
  hashResetCode,
} from "./passwordReset";

describe("passwordReset utils", () => {
  test("generateResetCode should generate hex string", () => {
    const code = generateResetCode();
    expect(code).toMatch(/^[a-f0-9]+$/i);
    expect(code.length).toBe(8);
  });

  test("validatePasswordPolicy should fail for weak password", () => {
    const weakPw = "abc123";
    const result = validatePasswordPolicy(weakPw);
    expect(result).not.toBeNull();
  });

  test("validatePasswordPolicy should pass for strong password", () => {
    const strongPw = "Str0ng@Password!";
    const result = validatePasswordPolicy(strongPw);
    expect(result).toBeNull();
  });

  test("hashResetCode and compareResetCode should work", async () => {
    const code = "abcd1234";
    const hash = await hashResetCode(code);
    const isValid = await compareResetCode(code, hash);
    expect(isValid).toBe(true);

    const wrong = await compareResetCode("zzzz", hash);
    expect(wrong).toBe(false);
  });
});