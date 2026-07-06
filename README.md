# Selenium Visual Recorder

Herramienta para **grabar pruebas automatizadas web sin escribir código**. Abres un panel visual, haces click sobre los elementos de la página, y el framework genera por ti los archivos `.feature` (Gherkin), los locators y los step definitions listos para ejecutarse con Cucumber + Selenium.

Pensado para que cualquier QA pueda automatizar un flujo en minutos.

---

## ¿Cómo funciona? (2 modos)

```
1. GRABAR      npm start   →  Grabas el flujo con el panel visual
2. EJECUTAR    npm test    →  Cucumber corre los casos grabados y genera reporte HTML
```

---

## Requisitos previos

| Herramienta | Versión | Verificar con |
|---|---|---|
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| Google Chrome | Cualquier versión reciente | — |

> ChromeDriver se descarga solo (lo maneja `selenium-webdriver`). No necesitas instalarlo.

## Instalación

```bash
cd selenium-visual-recorder
npm install
```

---

## Paso a paso: grabar tu primer caso

### 1. Inicia el grabador

```bash
npm start
```

Se abren **dos ventanas**:

- **Chrome** controlado por Selenium (aquí navegas la página a probar).
- **Panel Visual Recorder** (Electron): aquí grabas los steps.

### 2. Navega a la página

Escribe la URL en el panel (ej. `https://www.saucedemo.com`) y presiona **▶ Ir**.

### 3. Inspecciona un elemento

1. Click en **🔍 Inspeccionar** en el panel.
2. Pasa el mouse por Chrome: los elementos se resaltan.
3. Haz click sobre el elemento que quieres usar → su XPath se captura automáticamente.
4. Dale un **nombre de variable** descriptivo, ej. `btn_login`, `input_username`.
5. (Opcional) **✓ Verificar**: resalta el elemento en Chrome para confirmar que el selector es correcto.

### 4. Define y ejecuta el step

En **⚡ DEFINIR STEP** eliges la acción, el valor (si aplica) y presionas **▶ Ejecutar**. El step se ejecuta en Chrome de inmediato (así confirmas que funciona) y se agrega a **📋 STEPS GRABADOS**.

Acciones disponibles:

| Acción | Qué hace |
|---|---|
| NAVEGAR | Ir a una URL |
| CLICK | Click en un elemento |
| ESCRIBIR | Escribir texto en un campo |
| LIMPIAR | Vaciar un campo |
| SELECCIONAR | Elegir opción de un dropdown |
| VERIFICAR_TEXTO | Validar el texto de un elemento |
| VERIFICAR_EXISTE | Validar que un elemento es visible |
| VERIFICAR_NO_EXISTE | Validar que un elemento no está |
| ESPERAR | Esperar N segundos |
| SCREENSHOT | Tomar captura de pantalla |

### 5. Genera los archivos

Ponle nombre al Feature y al Scenario, luego tienes tres botones:

- **👁️ Preview**: ver el Gherkin antes de generar.
- **📄 Generar**: crea el `.feature` tal cual grabaste, con steps genéricos (imperativos).
- **🔗 Enlazar**: agrupa steps en pasos de negocio para un Gherkin limpio. **Recomendado** — ver la siguiente sección.

---

## 🔗 Enlazar: de steps imperativos a Gherkin limpio

Cuando grabas, los steps se generan de forma **imperativa**: cada click y cada texto es una línea. Funciona, pero el `.feature` queda largo y difícil de leer:

```gherkin
# Con "Generar" (imperativo)
Scenario: Login
  Given el usuario navega a "https://www.saucedemo.com"
  When el usuario escribe "standard_user" en "{input_user_name}"
  When el usuario escribe "secret_sauce" en "{input_password}"
  When el usuario hace click en "{input_login_button}"
  When el usuario hace click en "{button_add_to_cart_sauce_labs_backpack}"
  When el usuario hace click en "{button_add_to_cart_sauce_labs_bike_light}"
```

Con el botón **🔗 Enlazar** seleccionas un grupo de steps grabados y les das un nombre de negocio (ej. "se logea con un usuario valido"). El resultado es un Gherkin que cualquiera del equipo entiende:

```gherkin
# Con "Enlazar" (pasos de negocio)
Scenario: Login
  Given navega a saucedemo
  When se logea con un usuario valido
  And selecciona dos productos
```

### ¿Qué genera Enlazar por detrás?

El código del step se escribe automáticamente en `features/step_definitions/linked-steps.ts`:

```ts
Given('se logea con un usuario valido', async () => {
    await pages.basePage.type('input_user_name', 'standard_user');
    await pages.basePage.type('input_password', 'secret_sauce');
    await pages.basePage.click('input_login_button');
});
```

Puntos clave:

- No escribes este código: lo genera el panel. Tú solo agrupas y nombras.
- Los steps enlazados son **reutilizables**: una vez creado "se logea con un usuario valido", puedes usarlo en cualquier otro `.feature`.
- `linked-steps.ts` es auto-generado — no lo edites a mano, regenera desde el panel.

---

## Ejecutar los casos grabados

```bash
npm test
```

- Corre todos los `.feature` de `recorded/features/`.
- El reporte HTML queda en **`recorded/reports/report.html`** (ábrelo en el navegador).

Para correr un solo feature:

```bash
npx cucumber-js --config cucumber.json recorded/features/login.feature
```

---

## ¿Dónde queda cada cosa? (lo que te importa como QA)

```
recorded/
  features/                  ← Tus .feature grabados (Gherkin)
  reports/report.html        ← Reporte de la última ejecución

features/
  step_definitions/
    steps.ts                 ← Steps genéricos (click, escribir, verificar...)
    linked-steps.ts          ← Steps de negocio AUTO-GENERADOS por "Enlazar" (no editar a mano)
  support/Locators/
    Locators.ts              ← Locators AUTO-GENERADOS (nombre → XPath)
    login/...                ← Puedes organizarlos por página en subcarpetas
  screenobjects/
    commons/BasePage.ts      ← Acciones base (click, type, verify...)
    LoginPage.ts, HomePage.ts← Page Objects: agrega aquí métodos por página
```

### Formato de los locators

Los locators se guardan como constantes TypeScript. El framework los carga todos automáticamente (incluyendo subcarpetas):

```ts
// features/support/Locators/Locators.ts
export const Locators = Object.freeze({
    INPUT_USER_NAME:   '//*[@id="user-name"]',
    INPUT_LOGIN_BUTTON: '//*[@id="login-button"]',
});
```

En los `.feature` y en el código se referencian en minúsculas: `input_user_name`, `{input_login_button}`.

### Steps genéricos disponibles en Gherkin

```gherkin
Given el usuario navega a "https://..."
When  el usuario hace click en "{nombre_locator}"
When  el usuario escribe "texto" en "{nombre_locator}"
When  el usuario limpia el campo "{nombre_locator}"
When  el usuario selecciona "opcion" en "{nombre_locator}"
When  el usuario espera "2" segundos
When  el usuario toma una captura "nombre"
Then  el usuario verifica el texto "esperado" en "{nombre_locator}"
Then  el elemento "{nombre_locator}" es visible
Then  el elemento "{nombre_locator}" no es visible
```

---

## Scripts disponibles

| Comando | Qué hace |
|---|---|
| `npm start` | Abre el grabador (modo grabación) |
| `npm test` | Ejecuta los casos grabados y genera el reporte |
| `npm run build` | Compila el TypeScript (lo hace `npm start` automáticamente) |

## Tecnologías

Electron 28 · TypeScript 5 · Selenium WebDriver 4.18 · Cucumber 13 · Node.js 18+

---

## Problemas frecuentes

**Chrome no abre al hacer `npm start`**
Verifica que Google Chrome esté instalado y actualizado. ChromeDriver se descarga automáticamente en el primer arranque (necesitas internet).

**`npm test` falla con "element not found"**
La página cambió y el locator quedó desactualizado. Actualiza el XPath en `features/support/Locators/` (puedes capturarlo de nuevo con el inspector del grabador) o regraba el step.

**Mi step de negocio no aparece en Enlazar**
Los steps enlazados viven en `features/step_definitions/linked-steps.ts`. Es auto-generado: regenera desde el panel Enlazar en lugar de editarlo a mano.

**El reporte no se genera**
El reporte solo se crea al correr `npm test` (config `cucumber.json`). Revisa que exista la carpeta `recorded/reports/`.
