// Wearable provider configuration. Client IDs/secrets come from function secrets
// (set with `supabase secrets set OURA_CLIENT_ID=... OURA_CLIENT_SECRET=...`).
// Mappings extract { hrv (RMSSD ms), rhr (bpm), sleepHrs } for a given date — best-effort
// per each vendor's API; verify field names against current docs for your app.

export type Reading = { hrv?: number; rhr?: number; sleepHrs?: number }

export interface Provider {
  id: string
  authorizeUrl: string
  tokenUrl: string
  scope: string
  clientIdEnv: string
  clientSecretEnv: string
  fetchReading: (accessToken: string, date: string) => Promise<Reading>
}

const getJson = async (url: string, token: string) => {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!r.ok) throw new Error(`${url} -> ${r.status}`)
  return r.json()
}

export const PROVIDERS: Record<string, Provider> = {
  oura: {
    id: 'oura',
    authorizeUrl: 'https://cloud.ouraring.com/oauth/authorize',
    tokenUrl: 'https://api.ouraring.com/oauth/token',
    scope: 'daily heartrate',
    clientIdEnv: 'OURA_CLIENT_ID',
    clientSecretEnv: 'OURA_CLIENT_SECRET',
    async fetchReading(token, date) {
      const sleep = await getJson(`https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=${date}&end_date=${date}`, token)
      const rec = sleep?.data?.[0] ?? {}
      return { hrv: rec.average_hrv ?? rec.hrv, rhr: rec.lowest_heart_rate ?? rec.average_heart_rate, sleepHrs: rec.total_sleep_duration ? +(rec.total_sleep_duration / 3600).toFixed(1) : undefined }
    },
  },
  whoop: {
    id: 'whoop',
    authorizeUrl: 'https://api.prod.whoop.com/oauth/oauth2/auth',
    tokenUrl: 'https://api.prod.whoop.com/oauth/oauth2/token',
    scope: 'read:recovery read:sleep offline',
    clientIdEnv: 'WHOOP_CLIENT_ID',
    clientSecretEnv: 'WHOOP_CLIENT_SECRET',
    async fetchReading(token) {
      const rec = await getJson('https://api.prod.whoop.com/developer/v1/recovery?limit=1', token)
      const s = rec?.records?.[0]?.score ?? {}
      return { hrv: s.hrv_rmssd_milli, rhr: s.resting_heart_rate }
    },
  },
  fitbit: {
    id: 'fitbit',
    authorizeUrl: 'https://www.fitbit.com/oauth2/authorize',
    tokenUrl: 'https://api.fitbit.com/oauth2/token',
    scope: 'heartrate sleep',
    clientIdEnv: 'FITBIT_CLIENT_ID',
    clientSecretEnv: 'FITBIT_CLIENT_SECRET',
    async fetchReading(token, date) {
      const hrv = await getJson(`https://api.fitbit.com/1/user/-/hrv/date/${date}.json`, token).catch(() => ({}))
      const sleep = await getJson(`https://api.fitbit.com/1.2/user/-/sleep/date/${date}.json`, token).catch(() => ({}))
      const rmssd = hrv?.hrv?.[0]?.value?.dailyRmssd
      const mins = sleep?.summary?.totalMinutesAsleep
      return { hrv: rmssd, sleepHrs: mins ? +(mins / 60).toFixed(1) : undefined }
    },
  },
}
