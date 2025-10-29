#!/usr/bin/env node
/**
 * Minimal agent runner for GitHub Actions.
 * Usage: node github_actions.js <step> <spec.json>
 * Steps: plan | code | test | doc | guard
 * This skeleton writes real files with conservative scaffolds.
 */
const fs = require('fs');
const path = require('path');

const { readSpec, ensureDir, w, titleSlug } = require('../shared/utils');
const plan = require('../agents/plan');
const code = require('../agents/code');
const test = require('../agents/test');
const doc = require('../agents/doc');
const guard = require('../agents/guard');

(async () => {
  try {
    const step = process.argv[2];
    const specPath = process.argv[3] || 'spec.json';
    const spec = readSpec(specPath);

    switch (step) {
      case 'plan': {
        const tasks = plan(spec);
        process.stdout.write(JSON.stringify(tasks, null, 2));
        break;
      }
      case 'code': {
        await code(spec);
        break;
      }
      case 'test': {
        await test(spec);
        break;
      }
      case 'doc': {
        await doc(spec);
        break;
      }
      case 'guard': {
        const report = await guard(spec);
        // fail pipeline if critical
        if (report && report.fail) process.exit(1);
        break;
      }
      default:
        console.error('Unknown step. Use plan|code|test|doc|guard');
        process.exit(2);
    }
  } catch (e) {
    console.error(e.stack || e);
    process.exit(1);
  }
})();
