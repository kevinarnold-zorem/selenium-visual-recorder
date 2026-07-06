import { DriverManager } from '../../src/driverManager';
import { LocatorManager } from '../../src/locatorManager';
import { PageFactory } from '../pageFactory';

export const dm  = new DriverManager();
export const lm  = new LocatorManager();
export let   pages: PageFactory;

export function initPages(): void {
    pages = new PageFactory(dm, lm);
}
