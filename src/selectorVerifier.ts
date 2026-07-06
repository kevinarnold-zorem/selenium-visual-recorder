import { DriverManager } from './driverManager';
import { VerificationResult } from './models';
import { By, until } from 'selenium-webdriver';

export class SelectorVerifier {
    constructor(private dm: DriverManager) {}

    async verify(selector: string): Promise<VerificationResult> {
        try {
            const by = selector.startsWith('/') || selector.startsWith('(')
                ? By.xpath(selector)
                : By.css(selector);

            const el = await this.dm.getDriver().wait(
                until.elementLocated(by), 8000
            );

            // Resaltar en verde
            await this.dm.executeScript(`
                arguments[0].style.outline = '3px solid #00CC00';
                arguments[0].style.backgroundColor = 'rgba(0,204,0,0.15)';
                arguments[0].scrollIntoView({block:'center',behavior:'smooth'});
            `, el);

            // Quitar resaltado despues de 2s
            setTimeout(async () => {
                try {
                    await this.dm.executeScript(`
                        arguments[0].style.outline = '';
                        arguments[0].style.backgroundColor = '';
                    `, el);
                } catch (_) {}
            }, 2000);

            const tag  = await el.getTagName();
            const text = await el.getText();
            const type = await el.getAttribute('type') || '';

            const summary = `✓ Encontrado: <${tag}>${text ? ` "${text}"` : ''}${type ? ` [type=${type}]` : ''}`;
            console.log('[SelectorVerifier]', summary);
            return { success: true, tag, text, type, summary };

        } catch (e: any) {
            const summary = `✗ No encontrado: ${selector}`;
            console.error('[SelectorVerifier]', summary);
            return { success: false, error: e.message, summary };
        }
    }
}
