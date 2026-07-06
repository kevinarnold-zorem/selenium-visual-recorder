import { DriverManager } from './driverManager';
import { LocatorManager } from './locatorManager';
import { RecordedStep, ExecutionResult } from './models';
import { By } from 'selenium-webdriver';

export class StepExecutor {
    constructor(
        private dm: DriverManager,
        private lm: LocatorManager
    ) {}

    async execute(step: RecordedStep): Promise<ExecutionResult> {
        console.log('[StepExecutor] Ejecutando:', step.action, step.variableName || '');
        try {
            const selector = step.selector
                ? (step.selector.startsWith('{')
                    ? this.lm.resolve(step.selector)
                    : step.selector)
                : '';

            switch (step.action) {
                case 'NAVEGAR':
                    return await this.navegar(step.value!);
                case 'CLICK':
                    return await this.click(selector);
                case 'ESCRIBIR':
                    return await this.escribir(selector, step.value!);
                case 'LIMPIAR':
                    return await this.limpiar(selector);
                case 'SELECCIONAR':
                    return await this.seleccionar(selector, step.value!);
                case 'VERIFICAR_TEXTO':
                    return await this.verificarTexto(selector, step.value!);
                case 'VERIFICAR_EXISTE':
                    return await this.verificarExiste(selector);
                case 'VERIFICAR_NO_EXISTE':
                    return await this.verificarNoExiste(selector);
                case 'ESPERAR':
                    return await this.esperar(Number(step.value || 1));
                case 'SCREENSHOT':
                    return { success: true, message: 'Screenshot registrado' };
                default:
                    return { success: false, message: 'Accion no reconocida' };
            }
        } catch (e: any) {
            console.error('[StepExecutor] Error:', e.message);
            return { success: false, message: e.message };
        }
    }

    private async navegar(url: string): Promise<ExecutionResult> {
        await this.dm.navigateTo(url);
        return { success: true, message: `Navegado a: ${url}` };
    }

    private async click(selector: string): Promise<ExecutionResult> {
        const el = await this.dm.findElement(selector);
        await this.highlight(el, 'orange');
        await el.click();
        return { success: true, message: `Click en: ${selector}` };
    }

    private async escribir(selector: string, value: string): Promise<ExecutionResult> {
        const el = await this.dm.findElement(selector);
        await this.highlight(el, 'orange');
        await el.clear();
        await el.sendKeys(value);
        return { success: true, message: `Escrito "${value}" en: ${selector}` };
    }

    private async limpiar(selector: string): Promise<ExecutionResult> {
        const el = await this.dm.findElement(selector);
        await el.clear();
        return { success: true, message: `Limpiado: ${selector}` };
    }

    private async seleccionar(selector: string, value: string): Promise<ExecutionResult> {
        const el = await this.dm.findElement(selector);
        // Seleccionar opcion via JS para evitar dependencia de Select
        await this.dm.executeScript(`
            var select = arguments[0];
            var options = select.options;
            for (var i = 0; i < options.length; i++) {
                if (options[i].text.trim() === arguments[1]) {
                    select.selectedIndex = i;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    break;
                }
            }
        `, el, value);
        return { success: true, message: `Seleccionado "${value}" en: ${selector}` };
    }

    private async verificarTexto(selector: string, expected: string): Promise<ExecutionResult> {
        const el = await this.dm.findElement(selector);
        const actual = await el.getText();
        if (actual.includes(expected)) {
            await this.highlight(el, 'green');
            return { success: true, message: `Texto "${expected}" verificado` };
        }
        await this.highlight(el, 'red');
        return { success: false, message: `Esperado: "${expected}" | Actual: "${actual}"` };
    }

    private async verificarExiste(selector: string): Promise<ExecutionResult> {
        const el = await this.dm.findElement(selector);
        const visible = await el.isDisplayed();
        if (visible) {
            await this.highlight(el, 'green');
            return { success: true, message: `Elemento existe: ${selector}` };
        }
        return { success: false, message: `Elemento no visible: ${selector}` };
    }

    private async verificarNoExiste(selector: string): Promise<ExecutionResult> {
        try {
            const by = selector.startsWith('/') || selector.startsWith('(')
                ? By.xpath(selector) : By.css(selector);
            await this.dm.getDriver().findElement(by);
            return { success: false, message: `Elemento encontrado (se esperaba que no existiera)` };
        } catch {
            return { success: true, message: `Elemento no existe (correcto)` };
        }
    }

    private async esperar(seconds: number): Promise<ExecutionResult> {
        await new Promise(r => setTimeout(r, seconds * 1000));
        return { success: true, message: `Esperado ${seconds}s` };
    }

    private async highlight(el: any, color: 'orange' | 'green' | 'red'): Promise<void> {
        const colors: Record<string, string> = {
            orange: '3px solid #FF6600',
            green:  '3px solid #00CC00',
            red:    '3px solid #CC0000',
        };
        try {
            await this.dm.executeScript(
                `arguments[0].style.outline='${colors[color]}';
                 arguments[0].scrollIntoView({block:'center'});`, el
            );
            await new Promise(r => setTimeout(r, 300));
            await this.dm.executeScript(`arguments[0].style.outline='';`, el);
        } catch (_) {}
    }
}
