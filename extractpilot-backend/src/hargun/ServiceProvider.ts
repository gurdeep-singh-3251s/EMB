import { EmailService } from "./email-provider/service/EmailService";
import EmailServiceImpl from "./email-provider/service/EmailServiceImpl";

class ServiceProvider {
    private static _email:EmailService;

    static get emails():EmailService{
        return this._email ??= new EmailServiceImpl()
    }
}

export default ServiceProvider;