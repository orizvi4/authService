import { Injectable } from "@nestjs/common";
import axios from "axios";
import { Constants } from "../constants.class";
import { LoggerService } from "./logger.service";


@Injectable()
export class WebsocketService {
    public async userSignout(username: string) {
        try {
            await axios.post<void>(`${Constants.WEBSOCKET_PATH}/user/signout`, {username: username});
        }
        catch (err) {
            console.log(err);
            LoggerService.logError(err, "websocket");
        }
    }
}