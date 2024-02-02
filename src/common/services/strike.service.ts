import { InjectModel } from "@nestjs/mongoose";
import { strike } from "../enums/strike.enums";
import { UserStrike } from "src/common/models/userStrike.model";
import { Model } from "mongoose";
import { UserStrikeDTO } from "src/common/models/userStrike.dto";
import { ActiveDirectoryService } from "src/components/activeDirectory/activeDirectory.service";
import { Inject, forwardRef } from "@nestjs/common";
import { WebsocketService } from "./websocket.service";

export class StrikeService {

    constructor(
        @InjectModel(UserStrike.name) private readonly userStrikeModel: Model<UserStrike>,
        @Inject(forwardRef(() => ActiveDirectoryService)) private activeDirectoryService: ActiveDirectoryService,
        private websocketService: WebsocketService
    ) { }

    lowStrikes: strike[] = [strike.LOGIN_EXEEDED, strike.URL, strike.INVALID_INPUT];
    highStrikes: strike[] = [strike.EDITOR_REQUEST, strike.REQUEST, strike.MANAGER_URL];
    severeStrikes: strike[] = [strike.MANAGER_REQUEST, strike.LOCAL_STORAGE, strike.DOS];
    strikesArrays: strike[][] = [this.lowStrikes, this.highStrikes, this.severeStrikes];

    public async addLoginAttempt(username: string) {
        try {
            await this.userHandle(username);
            const user: UserStrikeDTO = await this.userStrikeModel.findOneAndUpdate({ username: username }, { $inc: { loginAttempts: 1 } });
            if (user.loginAttempts >= 6) {
                await this.strike(username, strike.LOGIN_EXEEDED);
            }
        }
        catch (err) {
            console.log(err);
        }
    }

    public async resetLoginAttempt(username: string) {
        try {
            await this.userHandle(username);
            await this.userStrikeModel.findOneAndUpdate({ username: username }, { $set: { loginAttempts: 0 } });
        }
        catch (err) {
            console.log(err);
        }
    }

    public async changeUsername(oldUsername: string, newUsername: string): Promise<void> {
        await this.userStrikeModel.findOneAndUpdate({ username: oldUsername }, { $set: {username: newUsername}});
    }

    public async userHandle(username: string) {//checks if user exist and create
        try {
            const user: UserStrikeDTO = await this.userStrikeModel.findOne({ username: username });
            if (!user) {
                await new this.userStrikeModel({
                    strikes: [],
                    panelty: 0,
                    loginAttempts: 0,
                    username: username,
                    isBlocked: false
                }).save();
            }
        }
        catch (err) {
            console.log(err);
        }
    }

    public async isBlocked(username: string): Promise<boolean> {
        await this.userHandle(username);
        return (await this.userStrikeModel.findOne({username: username})).isBlocked
    }

    public async strike(username: string | null, strike: strike) {
        try {
            console.log(strike);
            if (username != null) {
                await this.userHandle(username);
                const panelty: number = this.calculatePanelty(strike);
                const user: UserStrikeDTO = await this.userStrikeModel.findOneAndUpdate({ username: username }, { $inc: { panelty: panelty }, $push: { strikes: strike } }, {new: true});
                await this.websocketService.userSignout(username);//temp
                if (user.panelty >= 8) {
                    if (user.panelty >= 14) {
                        await this.activeDirectoryService.blockUser(username);
                        await this.userStrikeModel.findOneAndUpdate({ username: username }, { $set: {isBlocked: true}});
                        await this.websocketService.userSignout(username);
                    }
                    await this.userLimit(username);
                }
            }
        }
        catch (err) {
            console.log(err);
        }

    }

    public async unblockUser(username: string): Promise<void> {
        await this.userStrikeModel.findOneAndUpdate({ username: username }, { $set: {isBlocked: false}});
    }

    public async userLimit(username: string): Promise<void> {
        this.activeDirectoryService.limitUser(username);
        await this.websocketService.userSignout(username);
    }

    public calculatePanelty(strike: strike): number {
        for (let i: number = 0; i < this.strikesArrays.length; i++) {
            for (let j: number = 0; j < this.strikesArrays[i].length; j++) {
                if (this.strikesArrays[i][j] == strike) {
                    return 2 * i + (j + 1);
                }
            }
        }
        return 0;
    }

}