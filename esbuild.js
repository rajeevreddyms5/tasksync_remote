const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const watch = process.argv.includes('--watch');

// Verify runtime dependencies exist (these are external and must be in node_modules for the VSIX)
const requiredRuntimeDeps = ['socket.io', 'engine.io', 'ws', 'express'];

async function main() {
    // Pre-build check: ensure external deps are installed
    for (const dep of requiredRuntimeDeps) {
        const depPath = path.join(__dirname, 'node_modules', dep);
        if (!fs.existsSync(depPath)) {
            console.error(`\x1b[31mERROR: Missing runtime dependency "${dep}" in node_modules.\x1b[0m`);
            console.error('Run "npm install" before building.');
            process.exit(1);
        }
    }

    const ctx = await esbuild.context({
        entryPoints: ['src/extension.ts'],
        bundle: true,
        outfile: 'dist/extension.js',
        external: [
            'vscode',
            // Socket.io and its dependencies must be external
            // They don't bundle correctly with esbuild
            'socket.io',
            'engine.io',
            'ws',
            'bufferutil',
            'utf-8-validate'
        ],
        format: 'cjs',
        platform: 'node',
        target: 'node18',
        sourcemap: true,
        minify: !watch,
        // Handle ESM packages with .js extensions
        mainFields: ['module', 'main'],
        conditions: ['import', 'node'],
        resolveExtensions: ['.ts', '.js', '.mjs'],
    });

    if (watch) {
        await ctx.watch();
        console.log('Watching for changes...');
    } else {
        await ctx.rebuild();
        await ctx.dispose();
        console.log('Build complete');
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
