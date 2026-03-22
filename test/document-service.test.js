import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import ProjectDocumentService from '../lib/document-service.js';

const fixturePath = path.join(process.cwd(), 'project.md');
const fixtureContent = fs.readFileSync(fixturePath, 'utf-8');

const services = new Set();

afterEach(async () => {
  for (const service of services) {
    await service.dispose();
  }
  services.clear();
});

function makeTempProject() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'project-md-'));
  const filePath = path.join(directory, 'project.md');
  fs.writeFileSync(filePath, fixtureContent, 'utf-8');
  return filePath;
}

function createService() {
  const service = new ProjectDocumentService();
  services.add(service);
  return service;
}

async function waitForWatchReady() {
  await delay(150);
}

describe('ProjectDocumentService', () => {
  it('throws when reading without an open project', () => {
    const service = createService();
    assert.throws(() => service.getProject(), /No project loaded/);
  });

  it('opens a markdown file and reports status', async () => {
    const filePath = makeTempProject();
    const service = createService();

    const result = await service.openProject(filePath);

    assert.strictEqual(result.path, filePath);
    assert.strictEqual(result.data.title, 'Website Redesign');
    assert.deepStrictEqual(service.getStatus(), {
      loaded: true,
      path: filePath,
      filename: 'project.md',
    });
  });

  it('persists structured mutations back to the markdown file', async () => {
    const filePath = makeTempProject();
    const service = createService();
    await service.openProject(filePath);

    const updated = service.updateMilestone('M2', { status: 'In Progress' });

    assert.strictEqual(updated.milestones.find((item) => item.id === 'M2').status, 'In Progress');
    assert.match(fs.readFileSync(filePath, 'utf-8'), /\| M2\s+\| Beta Launch\s+\| 2025-08-01 \| In Progress \|/);
  });

  it('overwrites raw markdown and reloads the new contents', async () => {
    const filePath = makeTempProject();
    const service = createService();
    await service.openProject(filePath);

    const raw = fixtureContent.replace('Website Redesign', 'Desktop Migration');
    service.saveRaw(raw);

    assert.strictEqual(service.getRaw().content, raw);
    assert.strictEqual(service.getProject().title, 'Desktop Migration');
  });

  it('does not emit a change event for internal saves', async () => {
    const filePath = makeTempProject();
    const service = createService();
    await service.openProject(filePath);
    await waitForWatchReady();

    let changed = false;
    service.once('changed', () => {
      changed = true;
    });

    service.saveRaw(fixtureContent.replace('Website Redesign', 'Silent Save'));
    await delay(300);

    assert.strictEqual(changed, false);
  });

  it('emits a change event when the file is modified externally', async () => {
    const filePath = makeTempProject();
    const service = createService();
    await service.openProject(filePath);
    await waitForWatchReady();

    const changed = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timed out waiting for external change')), 2500);
      service.once('changed', () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    fs.writeFileSync(filePath, fixtureContent.replace('Website Redesign', 'Externally Updated'), 'utf-8');
    await changed;

    assert.strictEqual(service.getProject().title, 'Externally Updated');
  });
});
