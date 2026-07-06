// AUTO-GENERADO por Electron Visual Recorder
// Fecha: 12/6/2026, 16:17:50
// No editar manualmente — usar el panel Enlazar para regenerar

import { Given } from '@cucumber/cucumber';
import { pages } from '../support/setup';

Given('usuario se logea con un usuario bloqueado', async () => {
    await pages.basePage.type('input_user_name', 'locked_out_user');
    await pages.basePage.type('input_password', 'secret_sauce');
    await pages.basePage.click('input_login_button');
});

Given('verifica que no puede acceder', async () => {
    await pages.basePage.verifyText('h3_error', 'Epic sadface: Sorry, this user has been locked out.');
});

Given('el usuario se logea en saucedemo', async () => {
    await pages.loginPage.type('input_user_name', 'standard_user');
    await pages.loginPage.type('input_password', 'secret_sauce');
    await pages.loginPage.click('input_login_button');
});

Given('el usuario seleccion 3 productos', async () => {
    await pages.basePage.click('button_add_to_cart_sauce_labs_backpack');
    await pages.basePage.click('button_add_to_cart_sauce_labs_bike_light');
    await pages.basePage.click('button_add_to_cart_sauce_labs_bolt_t_shirt');
});

Given('el usuario se dirige al carrito de compras', async () => {
    await pages.basePage.click('a_shopping_cart_link');
});

Given('hace checkout', async () => {
    await pages.basePage.click('button_checkout');
});

Given('el usuario se logea con un usuario con problemas', async () => {
    await pages.basePage.type('input_user_name', 'problem_user');
    await pages.basePage.type('input_password', 'secret_sauce');
    await pages.basePage.click('input_login_button');
});

Given('nos logeamos con un usuario valido', async () => {
    await pages.basePage.type('input_user_name', 'standard_user');
    await pages.basePage.type('input_password', 'secret_sauce');
    await pages.basePage.click('input_login_button');
});

Given('selecciona 2 productos', async () => {
    await pages.basePage.click('button_add_to_cart_sauce_labs_bike_light');
    await pages.basePage.click('button_add_to_cart_sauce_labs_backpack');
});

Given('se logea con un usuario valido', async () => {
    await pages.basePage.type('input_user_name', 'standard_user');
    await pages.basePage.type('input_password', 'secret_sauce');
    await pages.basePage.click('input_login_button');
});

Given('selecciona dos productos', async () => {
    await pages.basePage.click('button_add_to_cart_sauce_labs_backpack');
    await pages.basePage.click('button_add_to_cart_sauce_labs_bike_light');
});

Given('navega a saucedemo', async () => {
    await pages.basePage.navigate('https://www.saucedemo.com/');
});
