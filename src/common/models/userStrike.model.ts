import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { strike } from "src/common/enums/strike.enums";

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
  strikes: strike[];
}

export const UserStrikeSchema = SchemaFactory.createForClass(UserStrike);