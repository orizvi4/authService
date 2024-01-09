import { Injectable } from "@nestjs/common";
import axios from "axios";
import { Constants } from "../constants.class";

@Injectable()
export class LoggerService {//error handling
    public static logInfo(message: string) {
        // axios.post<void>(`${Constants.LOGGER_SERVICE}/info`, {message: message, elasticIndex: Constants.ELASTIC_INDEX});
    }
    public static logError(message: string, category: string) {
        // axios.post<void>(`${Constants.LOGGER_SERVICE}/error`, {message: message, elasticIndex: Constants.ELASTIC_INDEX, category: category});
    }
}