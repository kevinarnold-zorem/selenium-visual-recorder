import { Builder, WebDriver, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';

export class DriverManager {
    private driver: WebDriver | null = null;

    async init(): Promise<void> {
        console.log('[DriverManager] Iniciando Chrome...');
        const options = new chrome.Options();
        options.addArguments('--start-maximized');
        options.addArguments('--no-sandbox');
        options.addArguments('--disable-gpu');
        options.addArguments('--disable-notifications');
        options.addArguments('--disable-infobars');
        options.setUserPreferences({
            'credentials_enable_service': false,
            'profile.password_manager_enabled': false,
            'profile.password_manager_leak_detection': false
        });

        this.driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .build();

        console.log('[DriverManager] Chrome iniciado');
    }

    getDriver(): WebDriver {
        if (!this.driver) throw new Error('Driver no iniciado');
        return this.driver;
    }

    async navigateTo(url: string): Promise<void> {
        await this.getDriver().get(url);
        console.log('[DriverManager] Navegando a:', url);
    }

    getCurrentUrl(): string {
        return 'chrome activo';
    }

    async executeScript(script: string, ...args: any[]): Promise<any> {
        return await this.getDriver().executeScript(script, ...args);
    }

    async findElement(selector: string) {
        const by = selector.startsWith('/') || selector.startsWith('(')
            ? By.xpath(selector)
            : By.css(selector);
        return await this.getDriver().wait(
            until.elementLocated(by), 10000
        );
    }

    async quit(): Promise<void> {
        if (this.driver) {
            console.log('[DriverManager] Cerrando Chrome...');
            await this.driver.quit();
            this.driver = null;
        }
    }

    isActive(): boolean {
        return this.driver !== null;
    }
}
