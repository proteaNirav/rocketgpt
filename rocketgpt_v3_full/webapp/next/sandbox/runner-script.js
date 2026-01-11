const fs = require('fs')
const path = require('path')

async function main() {
  const dir = process.argv[2]
  const summary = []

  const testFiles = fs.readdirSync(dir).filter((f) => f.endsWith('.js'))

  for (const f of testFiles) {
    const filePath = path.join(dir, f)
    const fn = require(filePath)

    const start = Date.now()
    try {
      const res = await fn()
      summary.push({
        test_case: f,
        status: 'passed',
        error: null,
        duration_ms: Date.now() - start,
      })
    } catch (err) {
      summary.push({
        test_case: f,
        status: 'failed',
        error: err?.message ?? String(err),
        duration_ms: Date.now() - start,
      })
    }
  }

  console.log(JSON.stringify({ status: 'success', results: summary }))
}

main()
