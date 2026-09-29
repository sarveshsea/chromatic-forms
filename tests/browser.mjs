import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const port = 5188;
const server = spawn('npm', ['run', 'dev', '--', '--port', String(port)], { stdio: 'ignore' });
const url = `http://127.0.0.1:${port}/`;

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try { if ((await fetch(url)).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Vite did not start');
}

function wavBuffer() {
  const sampleRate = 44100;
  const seconds = 2;
  const samples = sampleRate * seconds;
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write('WAVEfmt ', 8); buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24); buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36); buffer.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) {
    const envelope = i / sampleRate < .45 ? 0 : .32;
    buffer.writeInt16LE(Math.round(Math.sin(i * 2 * Math.PI * 110 / sampleRate) * envelope * 32767), 44 + i * 2);
  }
  return buffer;
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  await page.waitForTimeout(300);
  assert.match(await page.locator('#stage-note').textContent(), /DEMO MOTION/);
  const canvas = await page.locator('canvas').evaluate((element) => ({ width: element.width, height: element.height }));
  assert.ok(canvas.width > 1000 && canvas.height > 600);
  await page.locator('#file').setInputFiles({ name: 'test.wav', mimeType: 'audio/wav', buffer: wavBuffer() });
  await page.getByText('LIVE AUDIO REACTIVE').waitFor();
  await page.waitForTimeout(700);
  assert.match(await page.locator('#filename').textContent(), /TEST.WAV/);
  assert.equal(await page.locator('#seek').isDisabled(), false);
  assert.equal(await page.locator('#duration').textContent(), '0:02');
  await page.locator('#play').click();
  await page.locator('#seek').fill('500');
  await page.locator('#seek').dispatchEvent('change');
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log('Browser: demo canvas, WAV load, playback, seek, and no page errors passed');
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
