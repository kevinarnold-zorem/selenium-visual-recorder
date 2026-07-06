import { Given, When, Then, Before, After, setDefaultTimeout } from '@cucumber/cucumber';
import { dm, lm, pages, initPages } from '../support/setup';
import assert from 'assert';

setDefaultTimeout(60_000);

Before(async () => {
    await dm.init();
    initPages();
});

After(async () => {
    await dm.quit();
});

Given('el usuario navega a {string}', async (url: string) => {
    await dm.navigateTo(url);
});

When('el usuario hace click en {string}', async (locator: string) => {
    const name = locator.replace(/[{}]/g, '');
    await pages.basePage.click(name);
});

When('el usuario escribe {string} en {string}', async (value: string, locator: string) => {
    const name = locator.replace(/[{}]/g, '');
    await pages.basePage.type(name, value);
});

When('el usuario limpia el campo {string}', async (locator: string) => {
    const name = locator.replace(/[{}]/g, '');
    await pages.basePage.clear(name);
});

When('el usuario selecciona {string} en {string}', async (value: string, locator: string) => {
    const name = locator.replace(/[{}]/g, '');
    await pages.basePage.select(name, value);
});

When('el usuario espera {string} segundos', async (seconds: string) => {
    await pages.basePage.wait(parseFloat(seconds));
});

When('el usuario toma una captura {string}', async (name: string) => {
    await pages.basePage.screenshot(name);
});

Then('el usuario verifica el texto {string} en {string}', async (expected: string, locator: string) => {
    const name = locator.replace(/[{}]/g, '');
    await pages.basePage.verifyText(name, expected);
});

Then('el elemento {string} es visible', async (locator: string) => {
    const name = locator.replace(/[{}]/g, '');
    await pages.basePage.verifyVisible(name);
});

Then('el elemento {string} no es visible', async (locator: string) => {
    const name = locator.replace(/[{}]/g, '');
    await pages.basePage.verifyNotVisible(name);
});
