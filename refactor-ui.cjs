const fs = require('fs');
const path = require('path');

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            const original = content;

            // Global color scheme updates to modern minimal SaaS look
            content = content.replace(/bg-\[\#fafafa\]/g, 'bg-slate-50');
            content = content.replace(/bg-\[\#0a0a0a\]/g, 'bg-zinc-950');
            content = content.replace(/bg-\[\#0f0f0f\]/g, 'bg-zinc-900');
            content = content.replace(/bg-\[\#1a1a1a\]/g, 'bg-zinc-900');
            content = content.replace(/bg-\[\#111111\]/g, 'bg-zinc-900/50');
            
            content = content.replace(/border-\[\#e4e4e7\]/g, 'border-slate-200');
            content = content.replace(/border-\[\#1a1a1a\]/g, 'border-zinc-800');
            content = content.replace(/border-\[\#27272a\]/g, 'border-zinc-800/80');
            
            content = content.replace(/text-\[\#09090b\]/g, 'text-slate-900');
            content = content.replace(/text-\[\#e5e2e1\]/g, 'text-zinc-50');
            content = content.replace(/text-\[\#71717a\]/g, 'text-slate-500');
            content = content.replace(/text-\[\#a1a1aa\]/g, 'text-zinc-400');
            content = content.replace(/text-\[\#52525b\]/g, 'text-zinc-500');

            // Remove gigantic ambient blob strings safely (just empty them out or replace with simple class)
            // They usually start with `<div className="absolute inset-0 pointer-events-none z-0"`
            // or `<div className="absolute -top-32 -left-32 w-96 h-96...`
            content = content.replace(/<div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-500\/8 to-violet-500\/5 blur-3xl(.*?)<\/div>/gs, '');
            content = content.replace(/<div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-tl from-blue-500\/8 to-cyan-500\/5 blur-3xl(.*?)<\/div>/gs, '');

            if (content !== original) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Updated UI colors in: ' + fullPath);
            }
        }
    }
}

console.log('Starting full app UI refactor...');
processDirectory(path.join(__dirname, 'src'));
console.log('Refactor complete!');
