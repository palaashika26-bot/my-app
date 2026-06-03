import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

const SRC_DIR = path.resolve(__dirname, '../../src');

function readAllTsxFiles(): string[] {
  return glob.sync(`${SRC_DIR}/**/*.tsx`);
}

function fileContains(filePath: string, pattern: RegExp): boolean {
  const content = fs.readFileSync(filePath, 'utf-8');
  return pattern.test(content);
}

describe('Task 5 — No forbidden image-click patterns in source', () => {
  const files = readAllTsxFiles();

  it('no file uses window.open() with an image URL', () => {
    const offenders = files.filter((f) =>
      fileContains(
        f,
        /window\.open\s*\(.*image|window\.open\s*\(.*\.(jpg|png|webp|jpeg|gif)/i
      )
    );
    expect(offenders).toEqual([]);
  });

  it('no <img> is wrapped in an <a href> pointing to an image URL or base64', () => {
    const offenders = files.filter((f) =>
      fileContains(
        f,
        /<a[^>]+href[^>]*(http|data:image|\.jpg|\.png|\.webp)[^>]*>[^<]*<img/i
      )
    );
    expect(offenders).toEqual([]);
  });

  it('no onClick on img navigates away using router.push with an image URL', () => {
    const offenders = files.filter((f) =>
      fileContains(
        f,
        /onClick[^}]+(?:router\.push|navigate)\s*\([^)]*(\.(jpg|png|webp))/i
      )
    );
    expect(offenders).toEqual([]);
  });
});
