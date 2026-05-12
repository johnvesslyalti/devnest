import * as bcrypt from "bcrypt";

export default async function (data: {
  type: "hash" | "compare";
  payload: any;
}) {
  const { type, payload } = data;
  if (type === "hash") {
    return await bcrypt.hash(payload.password, payload.saltOrRounds);
  }
  if (type === "compare") {
    return await bcrypt.compare(payload.data, payload.encrypted);
  }
  throw new Error(`Unknown bcrypt operation: ${type}`);
}
