#!/usr/bin/env node
/**
 * 하네스 문서 규격 및 비대화 방지 공통 검증 스크립트 (Node.js ESM)
 * 외부 의존성 없이 Node 내장 모듈(fs, path, child_process)로만 동작합니다.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const HARNESS_DIR = path.resolve('.harness');
const ARCHIVE_DIR = path.join(HARNESS_DIR, 'archive');
const HANDOFF_FILE = path.join(HARNESS_DIR, 'HANDOFF.md');
const PLAN_FILE = path.join(HARNESS_DIR, 'PLAN.md');
const STATE_FILE = path.join(HARNESS_DIR, 'STATE.md');
const DECISIONS_FILE = path.join(HARNESS_DIR, 'DECISIONS.md');

const MAX_HANDOFF_SESSIONS = 5;
const MAX_HANDOFF_LINES = 200;
const MAX_STATE_LINES = 150;
const MAX_DECISIONS_LINES = 150;
const MAX_DECISIONS_BYTES = 20 * 1024; // 20KB 상한

const DPYB_REPOS = [
  'backend-ai-agent',
  'backend-core-api',
  'frontend-reader-web',
  'backend-record-api',
];

const ARCHIVE_FILE_PATTERN = /^(HANDOFF|STATE|DECISIONS)_\d{4}-\d{2}\.md$/;

function getCurrentRepoName() {
  try {
    const gitRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    const repoName = path.basename(gitRoot);
    if (DPYB_REPOS.includes(repoName)) return repoName;
  } catch {}
  const cwdName = path.basename(process.cwd());
  if (DPYB_REPOS.includes(cwdName)) return cwdName;
  return 'frontend-reader-web';
}

function validateArchiveDir() {
  const errors = [];
  if (!fs.existsSync(ARCHIVE_DIR)) return errors;
  const files = fs.readdirSync(ARCHIVE_DIR);
  for (const file of files) {
    const fullPath = path.join(ARCHIVE_DIR, file);
    if (fs.statSync(fullPath).isFile() && file.endsWith('.md')) {
      if (!ARCHIVE_FILE_PATTERN.test(file)) {
        errors.push(`archive 파일명 규격 위반: '${file}' (형식: '문서명_YYYY-MM.md')`);
      }
    }
  }
  return errors;
}

function validateCrossRepoKeywords(text, currentRepo, fileName) {
  const errors = [];
  const otherRepos = DPYB_REPOS.filter((repo) => repo !== currentRepo);
  const lines = text.split('\n');

  lines.forEach((line, idx) => {
    // URL, 도메인 호스트, 레포명#PR번호, repo/pull/123 형태는 허용
    let cleanLine = line.replace(/https?:\/\/\S+/g, '');
    cleanLine = cleanLine.replace(/(?:[\w-]+\/)?[\w-]+\/pull\/\d+/g, '');
    cleanLine = cleanLine.replace(/[\w-]+\/[\w-]+#\d+/g, '');
    cleanLine = cleanLine.replace(/[\w-]+#\d+/g, '');

    for (const other of otherRepos) {
      if (cleanLine.includes(other)) {
        errors.push(`${fileName}:${idx + 1}: 타 레포 키워드 감지: '${other}' (PR 링크 1줄 참조 외 서술 금지)`);
      }
    }
  });
  return errors;
}

function validateHandoff(currentRepo) {
  const errors = [];
  if (!fs.existsSync(HANDOFF_FILE)) return ['HANDOFF.md 파일이 존재하지 않습니다.'];
  const content = fs.readFileSync(HANDOFF_FILE, 'utf-8');
  const lines = content.split('\n');

  if (lines.length > MAX_HANDOFF_LINES) {
    errors.push(`HANDOFF.md 라인 수 초과: ${lines.length}줄 > 상한 ${MAX_HANDOFF_LINES}줄`);
  }
  // '## 세션 N' 또는 '## YYYY-MM-DD:' 두 가지 세션 헤더 패턴 지원
  const sessions = content.match(/^##\s+(세션\s+\d+|\d{4}-\d{2}-\d{2}:?)/gm) || [];
  if (sessions.length > MAX_HANDOFF_SESSIONS) {
    errors.push(`HANDOFF.md 세션 수 초과: ${sessions.length}개 > 상한 ${MAX_HANDOFF_SESSIONS}개`);
  }
  errors.push(...validateCrossRepoKeywords(content, currentRepo, 'HANDOFF.md'));
  return errors;
}

function validatePlan(currentRepo) {
  if (!fs.existsSync(PLAN_FILE)) return [];
  const content = fs.readFileSync(PLAN_FILE, 'utf-8');
  return validateCrossRepoKeywords(content, currentRepo, 'PLAN.md');
}

function validateState() {
  if (!fs.existsSync(STATE_FILE)) return [];
  const content = fs.readFileSync(STATE_FILE, 'utf-8');
  const lines = content.split('\n');
  if (lines.length > MAX_STATE_LINES) {
    return [`STATE.md 라인 수 초과: ${lines.length}줄 > 상한 ${MAX_STATE_LINES}줄`];
  }
  return [];
}

function validateDecisions() {
  if (!fs.existsSync(DECISIONS_FILE)) return [];
  const content = fs.readFileSync(DECISIONS_FILE, 'utf-8');
  const lines = content.split('\n');
  const errors = [];

  if (lines.length > MAX_DECISIONS_LINES) {
    errors.push(`DECISIONS.md 라인 수 초과: ${lines.length}줄 > 상한 ${MAX_DECISIONS_LINES}줄`);
  }
  const byteSize = Buffer.byteLength(content, 'utf-8');
  if (byteSize > MAX_DECISIONS_BYTES) {
    errors.push(`DECISIONS.md 용량 초과: ${(byteSize / 1024).toFixed(1)}KB > 상한 ${(MAX_DECISIONS_BYTES / 1024).toFixed(0)}KB`);
  }
  return errors;
}

function main() {
  const currentRepo = getCurrentRepoName();
  const errors = [
    ...validateArchiveDir(),
    ...validateHandoff(currentRepo),
    ...validatePlan(currentRepo),
    ...validateState(),
    ...validateDecisions(),
  ];

  if (errors.length > 0) {
    console.error(`❌ [${currentRepo}] 하네스 규격 검증 실패:`);
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log(`✅ [${currentRepo}] 하네스 규격 검증 통과 (HANDOFF, PLAN, STATE, DECISIONS, archive 정상)`);
  process.exit(0);
}

main();
