import { DTO } from "@repo/dto"
import ServiceProvider from "./ServiceProvider"



const getEmailsCRON = async () => {

    const config = {
        schedule: "0 * * * *",
    }


    const result = await ServiceProvider.emails.runner()

    if (!result.success) {
        //  log error
    }

    // always return true;
    return DTO.Success(null)
}