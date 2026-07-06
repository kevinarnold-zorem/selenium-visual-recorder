import { DriverManager } from '../src/driverManager';
import { LocatorManager } from '../src/locatorManager';
import { BasePage } from './screenobjects/commons/BasePage';
import { LoginPage } from './screenobjects/LoginPage';
import { HomePage } from './screenobjects/HomePage';

export class PageFactory {
    readonly basePage:  BasePage;
    readonly loginPage: LoginPage;
    readonly homePage:  HomePage;

    constructor(driver: DriverManager, lm: LocatorManager) {
        this.basePage  = new BasePage(driver, lm);
        this.loginPage = new LoginPage(driver, lm);
        this.homePage  = new HomePage(driver, lm);
    }
}
