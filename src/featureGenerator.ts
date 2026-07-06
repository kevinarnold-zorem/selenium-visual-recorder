import * as fs from 'fs';
import * as path from 'path';
import { RecordedStep, toGherkinLine } from './models';

export type LinkedStepsMap = Record<string, RecordedStep[]>;

export interface ScenarioLine {
    keyword: string;
    text: string;
}

export class FeatureGenerator {
    constructor(
        private featuresPath: string
    ) {}

    generate(featureName: string, scenarioName: string, steps: RecordedStep[]): string {
        fs.mkdirSync(this.featuresPath, { recursive: true });
        const fileName = featureName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        const filePath = path.join(this.featuresPath, `${fileName}.feature`);
        const content  = this.buildContent(featureName, scenarioName, steps);
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log('[FeatureGenerator] Generado:', filePath);
        return filePath;
    }

    preview(featureName: string, scenarioName: string, steps: RecordedStep[]): string {
        return this.buildContent(featureName, scenarioName, steps);
    }

    generateFromLines(featureName: string, scenarioName: string, lines: ScenarioLine[]): string {
        fs.mkdirSync(this.featuresPath, { recursive: true });
        const fileName = featureName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        const filePath = path.join(this.featuresPath, `${fileName}.feature`);
        const content  = this.buildContentFromLines(featureName, scenarioName, lines);
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log('[FeatureGenerator] Generado (enlazado):', filePath);
        return filePath;
    }

    private buildContentFromLines(featureName: string, scenarioName: string, lines: ScenarioLine[]): string {
        const date = new Date().toLocaleString('es-PE');
        const content = [
            `# Generado por Electron Visual Recorder (Enlazar)`,
            `# Fecha: ${date}`,
            '',
            `Feature: ${featureName}`,
            '',
            `  Scenario: ${scenarioName}`,
            ...lines.map(l => `    ${l.keyword} ${l.text}`),
            ''
        ];
        return content.join('\n');
    }

    // ─── LINKED STEPS: genera linked-steps.ts en lugar de JSON ──────────────────
    generateLinkedStepsFile(linkedMap: LinkedStepsMap): string {
        const outPath = path.join(process.cwd(), 'features/step_definitions/linked-steps.ts');

        if (!fs.existsSync(outPath)) {
            // Primera vez: crear archivo completo con header e imports
            fs.writeFileSync(outPath, this.buildLinkedStepsContent(linkedMap), 'utf-8');
            console.log('[FeatureGenerator] linked-steps.ts creado con', Object.keys(linkedMap).length, 'steps');
            return outPath;
        }

        // Archivo existe: solo appendear steps que aún no estén definidos
        const current = fs.readFileSync(outPath, 'utf-8');
        const toAppend: string[] = [];

        for (const [stepText, steps] of Object.entries(linkedMap)) {
            const escaped = stepText.replace(/'/g, "\\'");
            const alreadyExists = current.includes(`Given('${escaped}'`);
            console.log(`[FeatureGenerator] step "${stepText}" → existe: ${alreadyExists}, acciones: ${steps.length}`);
            if (alreadyExists) continue; // ya existe, saltar

            toAppend.push(`Given('${escaped}', async () => {`);
            for (const step of steps) {
                const call = this.buildPageCall(step);
                console.log(`[FeatureGenerator]   buildPageCall(${step?.action}, val="${step?.value || ''}") = "${call}"`);
                if (call) toAppend.push(`    ${call}`);
            }
            toAppend.push(`});`);
            toAppend.push(``);
        }

        if (toAppend.length > 0) {
            fs.appendFileSync(outPath, '\n' + toAppend.join('\n'), 'utf-8');
            console.log('[FeatureGenerator] linked-steps.ts: +', toAppend.filter(l => l.startsWith("Given(")).length, 'steps nuevos');
        } else {
            console.log('[FeatureGenerator] linked-steps.ts: sin steps nuevos');
        }

        return outPath;
    }

    private buildLinkedStepsContent(linkedMap: LinkedStepsMap): string {
        const date = new Date().toLocaleString('es-PE');
        const lines: string[] = [
            `// AUTO-GENERADO por Electron Visual Recorder`,
            `// Fecha: ${date}`,
            `// No editar manualmente — usar el panel Enlazar para regenerar`,
            ``,
            `import { Given } from '@cucumber/cucumber';`,
            `import { pages } from '../support/setup';`,
            ``
        ];

        for (const [stepText, steps] of Object.entries(linkedMap)) {
            if (steps.length === 0) continue;
            const escaped = stepText.replace(/'/g, "\\'");
            lines.push(`Given('${escaped}', async () => {`);
            for (const step of steps) {
                const call = this.buildPageCall(step);
                if (call) lines.push(`    ${call}`);
            }
            lines.push(`});`);
            lines.push(``);
        }

        return lines.join('\n');
    }

    private buildPageCall(step: RecordedStep): string {
        const name = step.variableName || '';
        const val  = (v: string) => `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

        switch (step.action) {
            case 'NAVEGAR':
                return `await pages.basePage.navigate(${val(step.value || '')});`;
            case 'CLICK':
                return `await pages.basePage.click(${val(name)});`;
            case 'ESCRIBIR':
                return `await pages.basePage.type(${val(name)}, ${val(step.value || '')});`;
            case 'LIMPIAR':
                return `await pages.basePage.clear(${val(name)});`;
            case 'SELECCIONAR':
                return `await pages.basePage.select(${val(name)}, ${val(step.value || '')});`;
            case 'VERIFICAR_TEXTO':
                return `await pages.basePage.verifyText(${val(name)}, ${val(step.value || '')});`;
            case 'VERIFICAR_EXISTE':
                return `await pages.basePage.verifyVisible(${val(name)});`;
            case 'VERIFICAR_NO_EXISTE':
                return `await pages.basePage.verifyNotVisible(${val(name)});`;
            case 'ESPERAR':
                return `await pages.basePage.wait(${parseFloat(step.value || '1')});`;
            case 'SCREENSHOT':
                return `await pages.basePage.screenshot(${val(step.value || 'screenshot')});`;
            default:
                return '';
        }
    }

    // ─── LOCATORS TS: genera archivos tipados por página ─────────────────────────
    generateLocatorsFile(steps: RecordedStep[], featureName: string): void {
        const ACTIONS_WITH_SELECTOR = new Set([
            'CLICK', 'ESCRIBIR', 'LIMPIAR', 'SELECCIONAR',
            'VERIFICAR_TEXTO', 'VERIFICAR_EXISTE', 'VERIFICAR_NO_EXISTE'
        ]);

        // Agrupar entries por página
        const byPage = new Map<string, Array<{ name: string; selector: string }>>();
        for (const step of steps) {
            if (!ACTIONS_WITH_SELECTOR.has(step.action)) continue;
            const name     = step.variableName?.trim();
            const selector = step.selector?.trim();
            if (!name || !selector) continue;
            const pageKey = step.page?.trim() || '__generic__';
            if (!byPage.has(pageKey)) byPage.set(pageKey, []);
            byPage.get(pageKey)!.push({ name, selector });
        }

        if (byPage.size === 0) return;

        const locatorsBase = path.join(process.cwd(), 'features/support/Locators');
        const safeFeature  = this.safeName(featureName);

        for (const [pageKey, entries] of byPage) {
            if (pageKey === '__generic__') {
                const filePath = path.join(locatorsBase, 'Locators.ts');
                this.appendToLocatorsFile(filePath, entries, 'Locators', true);
            } else {
                const safePage  = this.safeName(pageKey);
                const constName = safePage.charAt(0).toUpperCase() + safePage.slice(1) + 'Locators';
                const filePath  = path.join(locatorsBase, safeFeature, `${safePage}Locators.ts`);
                this.appendToLocatorsFile(filePath, entries, constName, false);
            }
        }
    }

    private safeName(text: string): string {
        return text.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    }

    private toConstKey(varName: string): string {
        return varName.toUpperCase();
    }

    private appendToLocatorsFile(
        filePath: string,
        entries: Array<{ name: string; selector: string }>,
        constName: string,
        isGeneric: boolean
    ): void {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const escSel = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

        if (!fs.existsSync(filePath)) {
            // Primera vez: crear archivo completo
            const header = isGeneric
                ? [
                    `// AUTO-GENERADO por Electron Visual Recorder`,
                    `// Ordena estos locators en archivos específicos por página cuando sea necesario`,
                    ``
                  ]
                : [
                    `// AUTO-GENERADO por Electron Visual Recorder`,
                    ``
                  ];
            const lines = [
                ...header,
                `export const ${constName} = Object.freeze({`,
                ...entries.map(e => `    ${this.toConstKey(e.name)}: '${escSel(e.selector)}',`),
                `});`,
                ``
            ];
            fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
            console.log(`[FeatureGenerator] Locators creado: ${filePath} (${entries.length} entradas)`);
            return;
        }

        // Archivo existe: solo agregar claves nuevas antes del cierre });
        let content = fs.readFileSync(filePath, 'utf-8');
        const toAdd: string[] = [];

        for (const entry of entries) {
            const key = this.toConstKey(entry.name);
            if (content.includes(`${key}:`)) continue; // ya existe
            toAdd.push(`    ${key}: '${escSel(entry.selector)}',`);
        }

        if (toAdd.length === 0) {
            console.log(`[FeatureGenerator] Locators sin cambios: ${filePath}`);
            return;
        }

        // Insertar antes del último });
        const closingIdx = content.lastIndexOf('});');
        if (closingIdx !== -1) {
            content = content.slice(0, closingIdx) + toAdd.join('\n') + '\n' + content.slice(closingIdx);
        } else {
            content += '\n' + toAdd.join('\n');
        }
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`[FeatureGenerator] Locators actualizado: ${filePath} (+${toAdd.length} entradas)`);
    }

    private buildContent(featureName: string, scenarioName: string, steps: RecordedStep[]): string {
        const date = new Date().toLocaleString('es-PE');
        const lines = [
            `# Generado por Electron Visual Recorder`,
            `# Fecha: ${date}`,
            '',
            `Feature: ${featureName}`,
            '',
            `  Scenario: ${scenarioName}`,
            ...steps.map((s, i) => `    ${toGherkinLine(s, i)}`),
            ''
        ];
        return lines.join('\n');
    }
}
