// Browser controls govern visibility only; backend authorization is independent.
export function poolingConfig(env = import.meta.env || {}) {
  const r1 = env.VITE_POOLING_R1 === 'true'
  return Object.freeze({
    r1,
    r2: r1 && env.VITE_POOLING_R2 === 'true',
    r3: r1 && env.VITE_POOLING_R3 === 'true',
    synthetic: env.DEV === true && !env.VITE_SUPABASE_URL && !env.VITE_SUPABASE_ANON_KEY && env.VITE_POOLING_SYNTHETIC === 'true',
  })
}
