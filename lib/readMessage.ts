import { callJson } from "./llmJson";
import { READ_JSON_SCHEMA, ReadResultSchema, type ReadResult } from "./schema";
import { READ_SYSTEM, readUser } from "./prompt";
import { guardRead, isTrivialChatter } from "./guard";

export interface ReadOutcome {
  result: ReadResult;
  dropped: number;
  skippedModel: boolean;
}

/** Read one message: trivial chatter skips the model, everything else goes through Gemma then the guard. */
export async function readMessage(
  sender: string,
  text: string,
  call: typeof callJson = callJson,
): Promise<ReadOutcome> {
  if (isTrivialChatter(text)) {
    return { result: { intent: "chatter", items: [], unclear: false }, dropped: 0, skippedModel: true };
  }
  const raw = await call(ReadResultSchema, { system: READ_SYSTEM, user: readUser(sender, text), jsonSchema: READ_JSON_SCHEMA });
  const { result, dropped } = guardRead(raw, text);
  return { result, dropped, skippedModel: false };
}
