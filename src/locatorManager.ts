import * as fs from 'fs';
import * as path from 'path';

const LOCATORS_BASE = path.join(process.cwd(), 'features/support/Locators');
const GENERIC_FILE  = path.join(LOCATORS_BASE, 'Locators.ts');

export class LocatorManager {
    private locators: Map<string, string> = new Map();

    constructor() {
        this.load();
    }

    private load(): void {
        this.locators.clear();
        if (!fs.existsSync(LOCATORS_BASE)) return;

        const scanDir = (dir: string): void => {
            for (const item of fs.readdirSync(dir)) {
                const full = path.join(dir, item);
                if (fs.statSync(full).isDirectory()) {
                    scanDir(full);
                } else if (item.endsWith('.ts')) {
                    const content = fs.readFileSync(full, 'utf-8');
                    const lineRe  = /^\s+([A-Z][A-Z0-9_]*):\s*'([^']+)',/gm;
                    for (const m of content.matchAll(lineRe)) {
                        // Guardar con key en minúscula (snake_case) para resolve()
                        this.locators.set(m[1].toLowerCase(), m[2]);
                    }
                }
            }
        };

        try {
            scanDir(LOCATORS_BASE);
            console.log(`[LocatorManager] Cargados ${this.locators.size} locators desde TS files`);
        } catch (e) {
            console.error('[LocatorManager] Error cargando locators:', e);
        }
    }

    reload(): void {
        this.load();
    }

    add(name: string, selector: string): void {
        const key = name.trim();
        if (this.locators.has(key)) return; // ya existe, no duplicar

        this.locators.set(key, selector);
        this.appendToGenericFile(key, selector);
        console.log(`[LocatorManager] Agregado: ${key} → ${selector}`);
    }

    private appendToGenericFile(varName: string, selector: string): void {
        const constKey = varName.toUpperCase();
        const escSel   = selector.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const newLine  = `    ${constKey}: '${escSel}',`;

        if (!fs.existsSync(LOCATORS_BASE)) {
            fs.mkdirSync(LOCATORS_BASE, { recursive: true });
        }

        if (!fs.existsSync(GENERIC_FILE)) {
            const content = [
                `// AUTO-GENERADO por Electron Visual Recorder`,
                `// Ordena estos locators en archivos específicos por página cuando sea necesario`,
                ``,
                `export const Locators = Object.freeze({`,
                newLine,
                `});`,
                ``
            ].join('\n');
            fs.writeFileSync(GENERIC_FILE, content, 'utf-8');
            return;
        }

        let content = fs.readFileSync(GENERIC_FILE, 'utf-8');
        if (content.includes(`${constKey}:`)) return; // ya existe en el archivo

        const closingIdx = content.lastIndexOf('});');
        if (closingIdx !== -1) {
            content = content.slice(0, closingIdx) + newLine + '\n' + content.slice(closingIdx);
        } else {
            content += '\n' + newLine;
        }
        fs.writeFileSync(GENERIC_FILE, content, 'utf-8');
    }

    resolve(variable: string): string {
        const key = variable.replace(/[{}]/g, '').toLowerCase();
        return this.locators.get(key) || variable;
    }

    exists(name: string): boolean {
        return this.locators.has(name.trim().toLowerCase());
    }

    getAll(): Record<string, string> {
        return Object.fromEntries(this.locators);
    }
}
