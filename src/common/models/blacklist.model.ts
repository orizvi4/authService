import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema()
export class Blacklist extends Document {
  @Prop()
  token: string;

  @Prop()
  type: string;

  @Prop()
  addedTime: Date;
}

export const BlacklistSchema = SchemaFactory.createForClass(Blacklist);