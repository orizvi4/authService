import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { strike } from "src/common/enums/strike.enums";
import { Strike } from "./strike.model";

@Schema()
export class UserStrike extends Document {
  @Prop()
  username: string;

  @Prop()
  panelty: number;

  @Prop()
  isBlocked: boolean;

  @Prop()
  loginAttempts: number;

  @Prop()
  strikes: Strike[];

  @Prop()
  refreshToken: string;
}

export const UserStrikeSchema = SchemaFactory.createForClass(UserStrike);