const levels = { error: 0, warn: 1, info: 2, debug: 3 }

function log(level, msg, meta) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg,
    rid: meta?.rid || '-',
  }
  const line = JSON.stringify(entry)
  if (level === 'error') process.stderr.write(line + '\n')
  else process.stdout.write(line + '\n')
}

export function createLogger(rid) {
  return {
    error: (msg, err) => log('error', msg, { rid, err: err?.message || err }),
    warn: (msg) => log('warn', msg, { rid }),
    info: (msg) => log('info', msg, { rid }),
    debug: (msg) => log('debug', msg, { rid }),
  }
}

export const rootLogger = createLogger('bootstrap')
