#!/usr/bin/env node

/**
 * Script para gerar ícones PWA a partir do SVG base
 * 
 * Requisitos:
 * - sharp: npm install sharp
 * 
 * Uso:
 * node scripts/generate-icons.mjs
 */

import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ICONS_DIR = join(__dirname, '../public/icons');
const SVG_PATH = join(ICONS_DIR, 'icon.svg');

// Tamanhos necessários para PWA
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// Tamanhos para ícones maskable (com padding)
const MASKABLE_SIZES = [192, 512];

async function generateIcons() {
  console.log('🎨 Generating PWA icons...\n');

  // Verifica se o diretório existe
  if (!existsSync(ICONS_DIR)) {
    mkdirSync(ICONS_DIR, { recursive: true });
  }

  // Lê o SVG
  const svgBuffer = readFileSync(SVG_PATH);

  // Gera ícones regulares
  for (const size of SIZES) {
    const outputPath = join(ICONS_DIR, `icon-${size}x${size}.png`);
    
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    
    console.log(`  ✅ icon-${size}x${size}.png`);
  }

  // Gera ícones maskable (com padding de 10% para safe area)
  for (const size of MASKABLE_SIZES) {
    const outputPath = join(ICONS_DIR, `maskable-${size}x${size}.png`);
    const innerSize = Math.floor(size * 0.8); // 80% do tamanho total
    const padding = Math.floor(size * 0.1); // 10% de padding
    
    // Cria um fundo com a cor primária
    const background = Buffer.from(
      `<svg width="${size}" height="${size}">
        <rect width="${size}" height="${size}" fill="#0f3460"/>
      </svg>`
    );
    
    // Redimensiona o ícone
    const icon = await sharp(svgBuffer)
      .resize(innerSize, innerSize)
      .toBuffer();
    
    // Compõe o ícone sobre o fundo
    await sharp(background)
      .composite([{ input: icon, left: padding, top: padding }])
      .png()
      .toFile(outputPath);
    
    console.log(`  ✅ maskable-${size}x${size}.png`);
  }

  // Gera badge para notificações (monocromático)
  const badgePath = join(ICONS_DIR, 'badge-72x72.png');
  await sharp(svgBuffer)
    .resize(72, 72)
    .grayscale()
    .png()
    .toFile(badgePath);
  console.log('  ✅ badge-72x72.png');

  // Gera favicon
  const faviconPath = join(ICONS_DIR, '../favicon.ico');
  await sharp(svgBuffer)
    .resize(32, 32)
    .toFormat('png')
    .toFile(join(ICONS_DIR, 'favicon-32x32.png'));
  console.log('  ✅ favicon-32x32.png');

  // Gera apple-touch-icon
  const applePath = join(ICONS_DIR, 'apple-touch-icon.png');
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(applePath);
  console.log('  ✅ apple-touch-icon.png');

  console.log('\n✨ All icons generated successfully!');
  console.log(`\n📁 Output directory: ${ICONS_DIR}`);
}

// Executa
generateIcons().catch(console.error);
