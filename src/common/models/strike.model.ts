import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { strike } from "src/common/enums/strike.enums";

@Schema()
export class Strike extends Document {
  @Prop()
  strike: strike;

  @Prop()
  time: Date;

  @Prop()
  relevant: boolean;
}

export const StrikeSchema = SchemaFactory.createForClass(Strike);