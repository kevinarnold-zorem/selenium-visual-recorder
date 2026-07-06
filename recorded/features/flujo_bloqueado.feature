# Generado por Electron Visual Recorder
# Fecha: 12/6/2026, 16:33:12
# Locators: ./recorded/locators/recorded.locators

Feature: Flujo bloqueado

  Scenario: Escenario grabado
    Given navega a saucedemo
    Given el usuario escribe "locked_out_user" en "{input_user_name}"
    When el usuario escribe "secret_sauce" en "{input_password}"
    And el usuario hace click en "{input_login_button}"
    Then el usuario verifica el texto "Epic sadface: Sorry, this user has been locked out." en "{h3_error}"
