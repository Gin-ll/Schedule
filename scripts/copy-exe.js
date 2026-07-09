import fs from 'fs';
import path from 'path';

const nsisDir = path.join(process.cwd(), 'src-tauri', 'target', 'release', 'bundle', 'nsis');
const targetDir = 'E:\\Schedule';

if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

if (fs.existsSync(nsisDir)) {
    const files = fs.readdirSync(nsisDir);
    let copied = false;
    for (const file of files) {
        if (file.endsWith('.exe')) {
            const src = path.join(nsisDir, file);
            const dest = path.join(targetDir, file);
            fs.copyFileSync(src, dest);
            console.log(`[Success] Copied installer: ${file} -> ${targetDir}`);
            copied = true;
        }
    }
    if (!copied) {
        console.log(`[Warning] No .exe files found in ${nsisDir}`);
    }
} else {
    console.log(`[Warning] NSIS bundle directory not found: ${nsisDir}`);
}

// 同时也拷贝一下免安装的可执行文件，以防需要
const releaseDir = path.join(process.cwd(), 'src-tauri', 'target', 'release');
if (fs.existsSync(releaseDir)) {
    const files = fs.readdirSync(releaseDir);
    for (const file of files) {
        if (file.endsWith('.exe')) {
            const src = path.join(releaseDir, file);
            // 避免覆盖安装包（如果有同名），一般单文件是 app.exe
            const dest = path.join(targetDir, file);
            try {
                fs.copyFileSync(src, dest);
                console.log(`[Success] Copied standalone app: ${file} -> ${targetDir}`);
            } catch (e) {
                // Ignore errors
            }
        }
    }
}
