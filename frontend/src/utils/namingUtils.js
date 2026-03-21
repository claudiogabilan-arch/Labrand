/**
 * Naming Module Utility Functions
 * Algorithmic name generation, phonetic analysis, global check, meaning lookup
 */

import { ARCHETYPES, WORD_BANKS, ROOTS, PREFIXES, SUFFIXES, LANG_OPTIONS } from '../data/namingData';

function cap(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function cl(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z]/g, '').toLowerCase();
}

export function generateNames(state) {
  const lang = state.project.language === 'mix' ? 'mix' : (state.project.language || 'pt');
  const bl = lang === 'mix' ? 'pt' : lang;
  const arch = ARCHETYPES.find(a => a.id === state.archetype);
  const archW = arch ? (arch.words[bl] || arch.words.pt) : [];
  const kw = state.keywords.map(k => k.toLowerCase());
  const bank = WORD_BANKS[bl] || WORD_BANKS.pt;
  const pool = [...new Set([...kw, ...archW, ...bank])].slice(0, 28);
  const res = [];
  const used = new Set();

  function add(w, tech) {
    const cln = w.trim();
    const wc = cap(cln);
    if (wc.length < 3 || wc.length > 14) return;
    if (used.has(wc.toLowerCase())) return;
    used.add(wc.toLowerCase());
    res.push({ word: wc, tech });
  }

  // Composição
  for (let i = 0; i < pool.length && res.length < 28; i++) {
    for (let j = i + 1; j < pool.length && res.length < 28; j++) {
      const a = cl(pool[i]), b = cl(pool[j]);
      if (a.length >= 3 && b.length >= 3) add(cap(a) + b, 'Composição');
    }
  }
  // Portmanteau
  for (let i = 0; i < pool.length - 1 && res.length < 40; i++) {
    const a = cl(pool[i]), b = cl(pool[i + 1]);
    if (a.length >= 4 && b.length >= 4) add(a.slice(0, Math.ceil(a.length / 2)) + b.slice(Math.floor(b.length / 2)), 'Portmanteau');
  }
  // Prefixo
  for (const w of pool.slice(0, 8)) {
    add(PREFIXES[Math.floor(Math.random() * PREFIXES.length)] + cl(w), 'Prefixo');
  }
  // Sufixo
  const sfx = (lang === 'mix' ? [...SUFFIXES.pt, ...SUFFIXES.en] : SUFFIXES[bl] || SUFFIXES.pt);
  for (const w of pool.slice(0, 8)) {
    add(cl(w) + sfx[Math.floor(Math.random() * sfx.length)], 'Sufixo');
  }
  // Acrônimo
  if (kw.length >= 2) {
    add(kw.map(k => k[0].toUpperCase()).join(''), 'Acrônimo');
    if (kw.length >= 3) add(kw.slice(0, 3).map(k => k[0].toUpperCase()).join('') + 'io', 'Acrônimo');
  }
  // Inversão
  for (const w of pool.slice(0, 5)) {
    const r = cl(w).split('').reverse().join('');
    if (r !== cl(w)) add(r, 'Inversão');
  }
  // Subtração
  for (const w of pool.slice(0, 5)) {
    const cut = cl(w).replace(/[aeiouáéíóúàèìòùâêîôûãõ]/gi, '');
    if (cut.length >= 3) add(cut, 'Subtração');
    add(cl(w).slice(0, 5), 'Subtração');
  }
  // Substituição
  for (const w of pool.slice(0, 5)) {
    add(cl(w).replace(/c/g, 'k').replace(/s(?!h)/g, 'z'), 'Substituição');
  }
  // Mix multilíngue
  if (lang === 'mix') {
    ['pt', 'en', 'es', 'fr', 'it', 'de', 'la'].forEach(l => {
      const lw = WORD_BANKS[l];
      if (lw) {
        const w = lw[Math.floor(Math.random() * lw.length)];
        add(w, 'Língua Estrangeira');
        if (archW.length) {
          const aw = archW[Math.floor(Math.random() * archW.length)];
          add(cap(cl(w)) + cl(aw).slice(0, 3), 'Blend Internacional');
        }
      }
    });
  }
  // Sufixo -ly / -io
  for (const w of kw.slice(0, 4)) {
    add(cl(w) + 'ly', 'Sufixo -ly');
    add(cl(w) + 'io', 'Sufixo -io');
  }

  return res.sort(() => Math.random() - 0.5).slice(0, 24);
}

export function getMeaning(name) {
  const lower = name.toLowerCase();
  const found = [];
  if (ROOTS[lower]) found.push(ROOTS[lower]);
  const sorted = Object.keys(ROOTS).sort((a, b) => b.length - a.length);
  for (const r of sorted) {
    if (lower.includes(r) && !found.join().includes(ROOTS[r]) && r.length >= 3) {
      found.push(`"${r}" = ${ROOTS[r]}`);
      if (found.length >= 2) break;
    }
  }
  return found.join(' · ');
}

export function analyzePhone(name) {
  const n = name.toLowerCase();
  const vowels = (n.match(/[aeiouáéíóúàèìòùâêîôûãõ]/gi) || []).length;
  const cons = n.length - vowels;
  const syl = Math.max(1, vowels);
  const hard = (n.match(/[bcdfghjklmnpqrstvwxyz]{3,}/g) || []).length;
  let pron = 'Fácil';
  if (hard > 0 || n.length > 10) pron = 'Médio';
  if (hard > 1 || n.length > 13) pron = 'Difícil';
  const mem = syl <= 3 && cons <= 6;
  const ratio = vowels / Math.max(1, n.length);
  let flow = 'Fluido', fb = 'good';
  if (ratio < 0.3) { flow = 'Seco'; fb = 'warn'; }
  if (ratio > 0.6) { flow = 'Suave'; fb = 'good'; }
  const alit = name.length > 1 && n[0] === n[Math.floor(n.length / 2)];
  let rc = 0;
  for (let i = 0; i < n.length - 1; i++) {
    const iv = /[aeiouáéíóúàèìòùâêîôûãõ]/i.test(n[i]);
    const nv = /[aeiouáéíóúàèìòùâêîôûãõ]/i.test(n[i + 1]);
    if (iv !== nv) rc++;
  }
  const rhy = rc >= Math.floor(n.length * 0.5);
  return { syl, mem, pron, flow, fb, alit, rhy };
}

export function splitSyl(name) {
  const res = [];
  let cur = '';
  const n = name.toLowerCase();
  for (let i = 0; i < n.length; i++) {
    cur += name[i];
    const iv = /[aeiouáéíóúàèìòùâêîôûãõ]/i.test(n[i]);
    const nc = i < n.length - 1 && !/[aeiouáéíóúàèìòùâêîôûãõ]/i.test(n[i + 1]);
    if (iv && nc && cur.length >= 2 && i < n.length - 2) {
      res.push(cur);
      cur = '';
    }
  }
  if (cur) res.push(cur);
  return res.length > 1 ? res.join('-') : name;
}

export function checkGlobal(name, lang) {
  const n = name.toLowerCase();
  const bad = {
    EN: ['ass', 'fuck', 'shit', 'hell'],
    ES: ['culo', 'mierda', 'puta'],
    FR: ['merde', 'cul', 'con'],
    DE: ['fick', 'schei', 'arsch']
  };
  if ((bad[lang] || []).some(p => n.includes(p))) return { status: 'warn', text: 'Verificar' };
  if (n.length > 10) return { status: 'warn', text: 'Extenso' };
  return { status: 'ok', text: 'Ok' };
}

export function exportReportTxt(state) {
  const names = state.selectedNames.length ? state.selectedNames : state.generatedNames.map(n => n.word);
  const crit = [
    { k: 'memo', l: 'Memorável' },
    { k: 'sound', l: 'Sonoridade' },
    { k: 'ortho', l: 'Ortografia' },
    { k: 'concept', l: 'Conceito' },
    { k: 'original', l: 'Originalidade' }
  ];

  const getStarVal = (name, key) => ((state.evaluations[name] || {})[key]) || 0;
  const scoreVal = (name) => crit.reduce((s, c) => s + getStarVal(name, c.k), 0);
  const sorted = [...names].sort((a, b) => scoreVal(b) - scoreVal(a));

  const sep = '─'.repeat(48);
  let txt = `LABRAND — RELATÓRIO DE NAMING\n${sep}\n`;
  txt += `Projeto: ${state.project.name}\nDescrição: ${state.project.desc}\nPúblico: ${state.project.audience}\n`;
  txt += `Arquétipo: ${ARCHETYPES.find(a => a.id === state.archetype)?.name || '—'}\n`;
  txt += `Idioma: ${LANG_OPTIONS.find(l => l.id === state.project.language)?.name || '—'}\n`;
  txt += `Data: ${new Date().toLocaleDateString('pt-BR')}\n\n`;
  txt += `NOMES (por pontuação)\n${sep}\n`;

  sorted.forEach((name, i) => {
    const sc = scoreVal(name);
    txt += `\n${i + 1}. ${name}  [${sc}/25]\n`;
    const found = state.generatedNames.find(n => n.word === name);
    txt += `   Técnica: ${found?.tech || '—'}\n`;
    const m = getMeaning(name);
    if (m) txt += `   Significado: ${m}\n`;
    crit.forEach(c => {
      const v = getStarVal(name, c.k);
      txt += `   ${c.l}: ${'★'.repeat(v)}${'☆'.repeat(5 - v)}\n`;
    });
  });

  txt += `\n${sep}\nGerado por LABrand — Ferramenta de Naming\n`;

  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `labrand-naming-${(state.project.name || 'projeto').replace(/\s+/g, '-').toLowerCase()}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
}
