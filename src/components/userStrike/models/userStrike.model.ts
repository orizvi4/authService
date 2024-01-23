import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema()
export class UserStrike extends Document {
  @Prop()
  userName: string;

  @Prop()
  strike: number;
}

export const UserStrikeSchema = SchemaFactory.createForClass(UserStrike);