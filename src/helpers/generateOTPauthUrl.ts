export const generateOTPauthUrl = (name: string, secret: string): string => {
  return `otpauth://totp/${encodeURIComponent(name.trim())}?secret=${secret.trim()}`
}
