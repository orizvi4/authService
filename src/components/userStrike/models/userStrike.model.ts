import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema()
export class UserStrike extends Document {
  @Prop()
  username: string;

  @Prop()
  strike: number;

  @Prop()
  actions: string[];
}

export const UserStrikeSchema = SchemaFactory.createForClass(UserStrike);