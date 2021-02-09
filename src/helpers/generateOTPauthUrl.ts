export const generateOTPauthUrl = (name: string, secret: string): string => {
  return `otpath://totp/${encodeURIComponent(name.trim())}?secret=${secret.trim()}`
}
