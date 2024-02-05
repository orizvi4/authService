import { StrikeDTO } from "./strike.dto";


export interface UserStrikeDTO {
    username: string;
    panelty: number;
    isBlocked: boolean;
    loginAttempts: number;
    strikes: StrikeDTO[];
}