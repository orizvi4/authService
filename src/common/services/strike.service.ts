import { strike } from "../strike.enums";

export class StrikeService {//save user strike
    lowStrikes: strike[] = [strike.LOGIN_EXEEDED, strike.URL, strike.INVALID_INPUT];
    highStrikes: strike[] = [strike.EDITOR_REQUEST, strike.REQUEST,  strike.MANAGER_URL];
    severeStrikes: strike[]= [strike.MANAGER_REQUEST, strike.LOCAL_STORAGE, strike.DOS];

    public async loginExceed(username: string) {//save actions and check them

    }

    public async strike(username: string, strike: strike) {//handle case no username
        //implement
    }
}