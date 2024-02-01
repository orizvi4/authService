import { strike } from "src/common/enums/strike.enums";

export interface UserStrikeDTO {
    username: string;
    panelty: number;
    isBlocked: boolean;
    loginAttempts: number;
    strikes: strike[];
}