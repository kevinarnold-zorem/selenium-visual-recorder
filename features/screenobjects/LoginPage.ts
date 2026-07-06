import { BasePage } from './commons/BasePage';

export class LoginPage extends BasePage {

    async login(user: string, password: string): Promise<void> {
        await this.type('input_user_name', user);
        await this.type('input_password', password);
        await this.click('input_login_button');
    }

}
