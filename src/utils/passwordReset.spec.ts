import {
  generateResetCode,
  validatePasswordPolicy,
  compareResetCode,
  hashResetCode,
} from "./passwordReset";

describe("passwordReset utils", () => {
  test("generateResetCode deve gerar string hex", () => {
    const code = generateResetCode();
    expect(code).toMatch(/^[a-f0-9]+$/i);
    expect(code.length).toBe(8);
  });

  test("validatePasswordPolicy deve falhar para senha fraca", () => {
    const weakPw = "abc123";
    const result = validatePasswordPolicy(weakPw);
    expect(result).not.toBeNull();
  });

  test("validatePasswordPolicy deve passar para senha forte", () => {
    const strongPw = "Str0ng@Password!";
    const result = validatePasswordPolicy(strongPw);
    expect(result).toBeNull();
  });

  test("hashResetCode e compareResetCode devem funcionar", async () => {
    const code = "abcd1234";
    const hash = await hashResetCode(code);
    const isValid = await compareResetCode(code, hash);
    expect(isValid).toBe(true);

    const wrong = await compareResetCode("zzzz", hash);
    expect(wrong).toBe(false);
  });
});