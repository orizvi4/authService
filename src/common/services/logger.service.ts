import { Injectable, InternalServerErrorException } from "@nestjs/common";
import axios from "axios";
import { Constants } from "../constants.class";

@Injectable()
export class LoggerService {//error handling
    public static async logInfo(message: string): Promise<void> {
        try {
            await axios.post<void>(`${Constants.LOGGER_SERVICE}/info`, { message: message, elasticIndex: Constants.ELASTIC_INDEX });
        }
        catch (err) {
            console.log(err.message);
        }
    }
    public static async logError(message: string, category: string): Promise<void> {
        try {
            await axios.post<void>(`${Constants.LOGGER_SERVICE}/error`, { message: message, elasticIndex: Constants.ELASTIC_INDEX, category: category });
        }
        catch (err) {
            console.log(err.message);
        }
    }
}