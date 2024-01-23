import { strike } from "../strike.enums";

export class StrikeService {//save user strike
    lowStrikes: strike[] = [strike.LOGIN_EXEEDED, strike.URL, strike.INVALID_INPUT];
    highStrikes: strike[] = [strike.EDITOR_REQUEST, strike.REQUEST];
    severeStrikes: strike[]= [strike.MANAGER_REQUEST, strike.MANAGER_URL, strike.LOCAL_STORAGE, strike.LOGIN_DOS];

    public async strike(username: string, strike: strike) {//get username from jwt
        //implement
    }
}