import { JwtPayload } from "jwt-decode";

export interface CustomJwtPayload extends JwtPayload {
    username: string | null;
    group?: string;
}