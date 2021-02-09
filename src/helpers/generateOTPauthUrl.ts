export const generateOTPauthUrl = (name: string, secret: string): string => {
  return `otpath://totp/${encodeURI(name.trim())}?secret=${secret.trim()}`
}
