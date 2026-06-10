import { GoogleAuth } from 'google-auth-library'

export function isGoogleConfigured() {
  return !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY)
}

export function getServiceAccountEmail() {
  return process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? null
}

export async function getAccessToken(scopes: string[]): Promise<string> {
  const auth = new GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes,
  })
  const client = await auth.getClient()
  const { token } = await client.getAccessToken()
  if (!token) throw new Error('לא ניתן היה לקבל אסימון גישה מ-Google')
  return token
}
