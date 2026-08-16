import { prisma } from "@/lib/db";
import { loginSecuritySchema, type LoginSecuritySettings } from "@/lib/validation";

export const LOGIN_SECURITY_SETTING_KEY = "security.login";

export const DEFAULT_LOGIN_SECURITY: LoginSecuritySettings = {
  lockoutEnabled: false,
  maxFailedLogins: 5,
  lockDurationMin: 15,
  rateLimitEnabled: false,
  ipAttemptLimit: 10,
  ipAttemptWindowMin: 10,
  failLimitPerEmailIp: 2,
  failWindowMin: 15,
};

export async function getLoginSecurity(): Promise<LoginSecuritySettings> {
  const record = await prisma.setting.findUnique({ where: { key: LOGIN_SECURITY_SETTING_KEY } });
  if (!record?.value) {
    return DEFAULT_LOGIN_SECURITY;
  }
  const parsed = loginSecuritySchema.safeParse(record.value);
  return parsed.success ? parsed.data : DEFAULT_LOGIN_SECURITY;
}

export async function saveLoginSecurity(
  settings: LoginSecuritySettings,
  updatedBy: string,
): Promise<void> {
  await prisma.setting.upsert({
    where: { key: LOGIN_SECURITY_SETTING_KEY },
    create: { key: LOGIN_SECURITY_SETTING_KEY, value: settings, updatedBy },
    update: { value: settings, updatedBy },
  });
}
