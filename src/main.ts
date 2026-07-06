import { app, BrowserWindow, ipcMain } from 'electron';
import * as fs from 'fs';
import path from 'path';
import { DriverManager } from './driverManager';
import { XPathInspector } from './xpathInspector';
import { SelectorVerifier } from './selectorVerifier';
import { LocatorManager } from './locatorManager';
import { FeatureGenerator, ScenarioLine, LinkedStepsMap } from './featureGenerator';
import { StepExecutor } from './stepExecutor';
import { RecordedStep } from './models';

let mainWindow: BrowserWindow | null = null;

const driverManager    = new DriverManager();
const locatorManager   = new LocatorManager();
const featureGenerator = new FeatureGenerator('./recorded/features');

let xpathInspector:   XPathInspector   | null = null;
let selectorVerifier: SelectorVerifier | null = null;
let stepExecutor:     StepExecutor     | null = null;
let recordedSteps:    RecordedStep[]   = [];

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 980,
        height: 820,
        minWidth: 900,
        minHeight: 700,
        title: 'Visual Recorder',
        backgroundColor: '#1E1E2E',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));


    mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(async () => {
    console.log('[Main] Iniciando Selenium Visual Recorder...');
    await driverManager.init();
    xpathInspector   = new XPathInspector(driverManager);
    selectorVerifier = new SelectorVerifier(driverManager);
    stepExecutor     = new StepExecutor(driverManager, locatorManager);
    createWindow();
    console.log('[Main] Listo');
});

app.on('window-all-closed', async () => {
    await driverManager.quit();
    app.quit();
});

// ─── IPC HANDLERS ────────────────────────────────────────────────────────────

ipcMain.handle('navigate', async (_, url: string) => {
    await driverManager.navigateTo(url);
    return { success: true, url: driverManager.getCurrentUrl() };
});

ipcMain.handle('activate-inspector', async () => {
    if (!xpathInspector) return { success: false, error: 'Inspector no iniciado' };
    await xpathInspector.activate();
    const result = await xpathInspector.waitForSelection(30);
    if (result) {
        const tag      = xpathInspector.getLastTag();
        const suggested = xpathInspector.suggestVariableName(result, tag);
        await xpathInspector.bringPanelToFront(mainWindow);
        return { success: true, xpath: result, tag, suggested };
    }
    await xpathInspector.bringPanelToFront(mainWindow);
    return { success: false, error: 'Cancelado o timeout' };
});

ipcMain.handle('verify-selector', async (_, selector: string) => {
    if (!selectorVerifier) return { success: false, error: 'Verifier no iniciado' };
    return await selectorVerifier.verify(selector);
});

ipcMain.handle('execute-step', async (_, stepData: RecordedStep) => {
    if (!stepExecutor) return { success: false, message: 'Executor no iniciado' };
    if (stepData.variableName && stepData.selector) {
        if (!locatorManager.exists(stepData.variableName)) {
            locatorManager.add(stepData.variableName, stepData.selector);
        }
    }
    const result = await stepExecutor.execute(stepData);
    if (result.success) {
        recordedSteps.push(stepData);
    }
    return { ...result, totalSteps: recordedSteps.length };
});

ipcMain.handle('delete-step', async (_, index: number) => {
    if (index >= 0 && index < recordedSteps.length) {
        recordedSteps.splice(index, 1);
    }
    return { success: true, totalSteps: recordedSteps.length };
});

ipcMain.handle('clear-steps', async () => {
    recordedSteps = [];
    return { success: true };
});

ipcMain.handle('preview-gherkin', async (_, featureName: string, scenarioName: string) => {
    const preview = featureGenerator.preview(featureName, scenarioName, recordedSteps);
    return { success: true, preview };
});

ipcMain.handle('generate-files', async (
    _,
    featureName: string,
    scenarioName: string,
    linkedMap?: LinkedStepsMap,
    scenarioLines?: ScenarioLine[]
) => {
    if (recordedSteps.length === 0) {
        return { success: false, error: 'No hay steps grabados' };
    }

    // Si vienen líneas del Enlazar → usar el escenario construido por el usuario
    // Si no → generar desde las acciones grabadas (modo normal)
    const filePath = scenarioLines && scenarioLines.length > 0
        ? featureGenerator.generateFromLines(featureName, scenarioName, scenarioLines)
        : featureGenerator.generate(featureName, scenarioName, recordedSteps);

    // Generar linked-steps.ts (TypeScript real) en lugar de JSON
    let linkedStepsPath: string | null = null;
    console.log('[Main] linkedMap recibido:', linkedMap ? JSON.stringify(Object.keys(linkedMap)) : 'null/undefined');
    if (linkedMap && Object.keys(linkedMap).length > 0) {
        for (const [key, steps] of Object.entries(linkedMap)) {
            console.log(`[Main]   step "${key}": ${(steps as any[]).map((s: any) => `${s.action}${s.value ? ':' + s.value : ''}`).join(', ')}`);
        }
        linkedStepsPath = featureGenerator.generateLinkedStepsFile(linkedMap);
        console.log('[Main] linked-steps.ts path:', linkedStepsPath);
    }

    // Generar archivos TS de locators agrupados por página y recargar el índice en memoria
    featureGenerator.generateLocatorsFile(recordedSteps, featureName);
    locatorManager.reload();

    return { success: true, featurePath: filePath, linkedStepsPath };
});

ipcMain.handle('get-current-url', async () => {
    return { url: driverManager.getCurrentUrl() };
});

ipcMain.handle('get-locators', async () => {
    return { locators: locatorManager.getAll() };
});

ipcMain.handle('get-steps', async () => {
    return { steps: recordedSteps };
});

ipcMain.handle('get-linked-steps-keys', () => {
    try {
        const tsPath = path.join(process.cwd(), 'features/step_definitions/linked-steps.ts');
        if (!fs.existsSync(tsPath)) return { keys: [] };
        const content = fs.readFileSync(tsPath, 'utf-8');
        const keys = [...content.matchAll(/Given\('([^']+)'/g)].map(m => m[1]);
        return { keys };
    } catch {
        return { keys: [] };
    }
});

ipcMain.handle('get-locator-index', () => {
    const locatorsBase = path.join(process.cwd(), 'features/support/Locators');
    if (!fs.existsSync(locatorsBase)) return { entries: [] };

    const entries: Array<{
        key: string;
        varName: string;
        selector: string;
        constName: string;
        file: string;
    }> = [];

    function scanDir(dir: string): void {
        for (const item of fs.readdirSync(dir)) {
            const full = path.join(dir, item);
            if (fs.statSync(full).isDirectory()) {
                scanDir(full);
            } else if (item.endsWith('.ts')) {
                const relative  = path.relative(locatorsBase, full).replace(/\\/g, '/');
                const content   = fs.readFileSync(full, 'utf-8');
                // Extraer nombre del export const
                const constMatch = content.match(/export const (\w+)\s*=/);
                const constName  = constMatch ? constMatch[1] : item.replace('.ts', '');
                // Parsear cada línea CLAVE: 'selector'
                const lineRe = /^\s+([A-Z][A-Z0-9_]*):\s*'([^']+)',/gm;
                for (const m of content.matchAll(lineRe)) {
                    entries.push({
                        key:       m[1],
                        varName:   m[1].toLowerCase(),
                        selector:  m[2],
                        constName,
                        file:      relative,
                    });
                }
            }
        }
    }

    try {
        scanDir(locatorsBase);
    } catch (e) {
        console.error('[Main] get-locator-index error:', e);
    }

    return { entries };
});
