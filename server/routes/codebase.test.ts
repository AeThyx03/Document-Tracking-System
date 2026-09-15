import assert from 'assert';
import { buildVerificationPrompt } from './codebase.ts';

console.log('--- POSSD Codebase Compilation & Review Unit Tests ---');

// Test 1: buildVerificationPrompt generates valid string with file count
const sampleCode = '// Sample codebase\nconst a = 1;';
const prompt = buildVerificationPrompt(sampleCode, 5);

assert.ok(typeof prompt === 'string', 'Prompt is a string');
assert.ok(prompt.includes('POSSD Document Tracking and Action Management System'), 'Prompt includes system title');
assert.ok(prompt.includes('COMPILED CODEBASE (5 Files)'), 'Prompt includes file count');
assert.ok(prompt.includes('const a = 1;'), 'Prompt contains codebase text');
assert.ok(prompt.includes('Asia/Manila (PST) timezone'), 'Prompt specifies Manila timezone checking');
console.log('✅ PASS: buildVerificationPrompt generates structured verification instructions');

console.log('🎉 Codebase Compilation Test Summary: All tests passed!');
