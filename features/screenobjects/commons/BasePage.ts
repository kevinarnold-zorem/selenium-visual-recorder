import { DriverManager } from '../../../src/driverManager';
import { LocatorManager } from '../../../src/locatorManager';

export class BasePage {
    constructor(
        protected driver: DriverManager,
        protected lm: LocatorManager
    ) {}

    // Resuelve el nombre del locator a su selector (XPath o CSS)
    protected resolve(locatorName: string): string {
        return this.lm.resolve(`{${locatorName}}`);
    }

    async navigate(url: string): Promise<void> {
        await this.driver.navigateTo(url);
    }

    async click(locatorName: string): Promise<void> {
        const el = await this.driver.findElement(this.resolve(locatorName));
        await this.highlight(el, 'orange');
        await el.click();
    }

    async type(locatorName: string, value: string): Promise<void> {
        const el = await this.driver.findElement(this.resolve(locatorName));
        await this.highlight(el, 'orange');
        await el.clear();
        await el.sendKeys(value);
    }

    async clear(locatorName: string): Promise<void> {
        const el = await this.driver.findElement(this.resolve(locatorName));
        await el.clear();
    }

    async select(locatorName: string, value: string): Promise<void> {
        const el = await this.driver.findElement(this.resolve(locatorName));
        await this.driver.executeScript(`
            var select = arguments[0];
            for (var i = 0; i < select.options.length; i++) {
                if (select.options[i].text.trim() === arguments[1]) {
                    select.selectedIndex = i;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    break;
                }
            }
        `, el, value);
    }

    async isVisible(locatorName: string): Promise<boolean> {
        try {
            const el = await this.driver.findElement(this.resolve(locatorName));
            return await el.isDisplayed();
        } catch {
            return false;
        }
    }

    async verifyText(locatorName: string, expected: string): Promise<void> {
        const el = await this.driver.findElement(this.resolve(locatorName));
        const actual = await el.getText();
        await this.highlight(el, actual.includes(expected) ? 'green' : 'red');
        if (!actual.includes(expected)) {
            throw new Error(`Texto esperado: "${expected}" | Actual: "${actual}"`);
        }
    }

    async verifyVisible(locatorName: string): Promise<void> {
        const visible = await this.isVisible(locatorName);
        if (!visible) throw new Error(`Elemento no visible: ${locatorName}`);
    }

    async verifyNotVisible(locatorName: string): Promise<void> {
        const visible = await this.isVisible(locatorName);
        if (visible) throw new Error(`Elemento visible (se esperaba que no existiera): ${locatorName}`);
    }

    async wait(seconds: number): Promise<void> {
        await new Promise(r => setTimeout(r, seconds * 1000));
    }

    async screenshot(name = 'screenshot'): Promise<void> {
        console.log(`[BasePage] Screenshot: ${name}`);
    }

    private async highlight(el: any, color: 'orange' | 'green' | 'red'): Promise<void> {
        const borders: Record<string, string> = {
            orange: '3px solid #FF6600',
            green:  '3px solid #00CC00',
            red:    '3px solid #CC0000',
        };
        try {
            await this.driver.executeScript(
                `arguments[0].style.outline='${borders[color]}';
                 arguments[0].scrollIntoView({ block: 'center' });`, el
            );
            await new Promise(r => setTimeout(r, 300));
            await this.driver.executeScript(`arguments[0].style.outline='';`, el);
        } catch (_) {}
    }
}
