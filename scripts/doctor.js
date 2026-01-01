#!/usr/bin/env node

/**
 * VERSIX NORMA - Environment Doctor
 * Verifica se o ambiente de desenvolvimento está configurado corretamente
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = process.cwd();

// Cores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  dim: '\x1b[2m',
};

const icons = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
};

let hasErrors = false;
let hasWarnings = false;

function log(icon, message, color = colors.reset) {
  console.log(`${icon} ${color}${message}${colors.reset}`);
}

function checkCommand(command, versionFlag = '--version') {
  try {
    const result = execSync(`${command} ${versionFlag}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return { success: true, version: result.split('\n')[0] };
  } catch {
    return { success: false, version: null };
  }
}

function checkFile(path, description) {
  const fullPath = resolve(ROOT, path);
  const exists = existsSync(fullPath);
  if (exists) {
    log(icons.success, `${description}: ${path}`, colors.green);
  } else {
    log(icons.error, `${description}: ${path} (não encontrado)`, colors.red);
    hasErrors = true;
  }
  return exists;
}

function checkEnvVar(varName, required = true) {
  const value = process.env[varName];
  if (value) {
    log(icons.success, `${varName}: configurado`, colors.green);
    return true;
  } else if (required) {
    log(icons.error, `${varName}: não configurado (obrigatório)`, colors.red);
    hasErrors = true;
    return false;
  } else {
    log(icons.warning, `${varName}: não configurado (opcional)`, colors.yellow);
    hasWarnings = true;
    return false;
  }
}

function parseVersion(version) {
  const match = version.match(/(\d+)\.(\d+)\.(\d+)/);
  if (match) {
    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
    };
  }
  return null;
}

function checkVersionRequirement(current, required) {
  const currentParsed = parseVersion(current);
  const requiredParsed = parseVersion(required);

  if (!currentParsed || !requiredParsed) return true;

  if (currentParsed.major > requiredParsed.major) return true;
  if (currentParsed.major < requiredParsed.major) return false;
  if (currentParsed.minor > requiredParsed.minor) return true;
  if (currentParsed.minor < requiredParsed.minor) return false;
  return currentParsed.patch >= requiredParsed.patch;
}

console.log('\n');
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║         VERSIX NORMA - Environment Doctor                 ║');
console.log('║                     v1.0.1                                ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log('\n');

// ===== FERRAMENTAS OBRIGATÓRIAS =====
console.log(`${colors.blue}▸ Ferramentas Obrigatórias${colors.reset}\n`);

// Node.js
const node = checkCommand('node');
if (node.success) {
  const meetsRequirement = checkVersionRequirement(node.version, '20.0.0');
  if (meetsRequirement) {
    log(icons.success, `Node.js: ${node.version}`, colors.green);
  } else {
    log(icons.error, `Node.js: ${node.version} (requer >= 20.0.0)`, colors.red);
    hasErrors = true;
  }
} else {
  log(icons.error, 'Node.js: não encontrado', colors.red);
  hasErrors = true;
}

// pnpm
const pnpm = checkCommand('pnpm');
if (pnpm.success) {
  const meetsRequirement = checkVersionRequirement(pnpm.version, '8.0.0');
  if (meetsRequirement) {
    log(icons.success, `pnpm: ${pnpm.version}`, colors.green);
  } else {
    log(icons.error, `pnpm: ${pnpm.version} (requer >= 8.0.0)`, colors.red);
    hasErrors = true;
  }
} else {
  log(icons.error, 'pnpm: não encontrado (npm install -g pnpm)', colors.red);
  hasErrors = true;
}

// Git
const git = checkCommand('git');
if (git.success) {
  log(icons.success, `Git: ${git.version}`, colors.green);
} else {
  log(icons.error, 'Git: não encontrado', colors.red);
  hasErrors = true;
}

console.log('');

// ===== FERRAMENTAS OPCIONAIS =====
console.log(`${colors.blue}▸ Ferramentas Opcionais${colors.reset}\n`);

// Supabase CLI
const supabase = checkCommand('supabase');
if (supabase.success) {
  log(icons.success, `Supabase CLI: ${supabase.version}`, colors.green);
} else {
  log(icons.warning, 'Supabase CLI: não encontrado (npm install -g supabase)', colors.yellow);
  hasWarnings = true;
}

// Docker
const docker = checkCommand('docker');
if (docker.success) {
  log(icons.success, `Docker: ${docker.version}`, colors.green);
} else {
  log(icons.warning, 'Docker: não encontrado (necessário para Supabase local)', colors.yellow);
  hasWarnings = true;
}

console.log('');

// ===== ARQUIVOS DO PROJETO =====
console.log(`${colors.blue}▸ Arquivos do Projeto${colors.reset}\n`);

checkFile('package.json', 'Package.json');
checkFile('pnpm-workspace.yaml', 'Workspace config');
checkFile('turbo.json', 'Turbo config');
checkFile('tsconfig.json', 'TypeScript config');
checkFile('.prettierrc', 'Prettier config');
checkFile('eslint.config.js', 'ESLint config');

console.log('');

// ===== VARIÁVEIS DE AMBIENTE =====
console.log(`${colors.blue}▸ Variáveis de Ambiente${colors.reset}\n`);

// Carregar .env.local se existir
const envLocalPath = resolve(ROOT, '.env.local');
if (existsSync(envLocalPath)) {
  log(icons.success, '.env.local encontrado', colors.green);

  // Simular carregamento
  const envContent = readFileSync(envLocalPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = value.trim();
      }
    }
  });
} else {
  log(icons.warning, '.env.local não encontrado (copie de .env.example)', colors.yellow);
  hasWarnings = true;
}

// Verificar variáveis críticas
const envVars = [
  { name: 'SUPABASE_URL', required: false },
  { name: 'SUPABASE_ANON_KEY', required: false },
  { name: 'NEXT_PUBLIC_APP_URL', required: false },
];

envVars.forEach(({ name, required }) => {
  const value = process.env[name];
  if (value && value !== '' && !value.includes('xxxxx')) {
    log(icons.success, `${name}: configurado`, colors.green);
  } else if (required) {
    log(icons.error, `${name}: não configurado`, colors.red);
    hasErrors = true;
  } else {
    log(icons.info, `${name}: não configurado (configure quando necessário)`, colors.dim);
  }
});

console.log('');

// ===== ESTRUTURA DE PASTAS =====
console.log(`${colors.blue}▸ Estrutura de Pastas${colors.reset}\n`);

const folders = [
  { path: 'apps', description: 'Apps directory' },
  { path: 'packages', description: 'Packages directory' },
  { path: 'supabase', description: 'Supabase directory' },
  { path: 'supabase/functions', description: 'Edge Functions' },
  { path: 'supabase/migrations', description: 'Migrations' },
];

folders.forEach(({ path, description }) => {
  const fullPath = resolve(ROOT, path);
  if (existsSync(fullPath)) {
    log(icons.success, `${description}: ${path}`, colors.green);
  } else {
    log(icons.warning, `${description}: ${path} (não existe)`, colors.yellow);
    hasWarnings = true;
  }
});

console.log('');

// ===== RESUMO =====
console.log('═'.repeat(60));
console.log('');

if (hasErrors) {
  log(icons.error, 'Ambiente com ERROS. Corrija os itens acima.', colors.red);
  process.exit(1);
} else if (hasWarnings) {
  log(icons.warning, 'Ambiente OK com avisos. Alguns itens opcionais faltando.', colors.yellow);
  process.exit(0);
} else {
  log(icons.success, 'Ambiente OK! Pronto para desenvolvimento.', colors.green);
  process.exit(0);
}

console.log('');
