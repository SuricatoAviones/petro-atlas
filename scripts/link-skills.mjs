// Links .claude/skills to .agents/skills, the single versioned copy of the agent skills.
// Claude Code only discovers project skills under .claude/skills; other agents read .agents/skills.
// Uses a junction on Windows, which needs no administrator rights. Usage: pnpm skills:link
import { existsSync, lstatSync, mkdirSync, rmSync, symlinkSync } from 'node:fs';
import path from 'node:path';

const repoRoot = path.join(import.meta.dirname, '..');
const target = path.join(repoRoot, '.agents', 'skills');
const link = path.join(repoRoot, '.claude', 'skills');

if (existsSync(link) || lstatSync(link, { throwIfNoEntry: false }) !== undefined) {
  if (!lstatSync(link).isSymbolicLink()) {
    throw new Error(`${link} is a real directory. Remove it first; skills live in .agents/skills.`);
  }
  rmSync(link);
}
mkdirSync(path.dirname(link), { recursive: true });
symlinkSync(target, link, 'junction');
console.log(`Linked ${link} -> ${target}`);
