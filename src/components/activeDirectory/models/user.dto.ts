import { group } from "src/common/enums/group.enums";

export interface UserDTO {
    username: string;
    password: string;
    sn: string;
    group: group;
    mail: string;
    telephoneNumber: string;
}