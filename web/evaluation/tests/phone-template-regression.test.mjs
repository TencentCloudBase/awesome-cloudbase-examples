import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cases = [
  {
    name: 'sign-in-phone',
    filePath: path.join(__dirname, '..', 'sign-in-phone', 'src', 'App.tsx'),
  },
  {
    name: 'sign-up-phone',
    filePath: path.join(__dirname, '..', 'sign-up-phone', 'src', 'App.tsx'),
  },
];

for (const template of cases) {
  test(`${template.name} uses ref to hold verifyOtp callback`, () => {
    const source = readFileSync(template.filePath, 'utf8');

    assert.match(source, /useRef\s*</, 'should declare verifyOtp via useRef');
    assert.doesNotMatch(
      source,
      /const\s*\[\s*verifyOtp\s*,\s*setVerifyOtp\s*\]\s*=\s*useState/s,
      'should not store verifyOtp callback in React state'
    );
    assert.match(source, /verifyOtpRef\.current/, 'should read verifyOtp through ref.current');
  });
}
