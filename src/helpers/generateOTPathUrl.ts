export const generateOTPathUrl = (name: string, secret: string) => {
  return `otpath://totp/${encodeURI(name.trim())}?secret=${secret.trim()}`
}
