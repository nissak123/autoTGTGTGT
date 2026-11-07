const api = () => "https://api.telegram.org/bot" + process.env.TELEGRAM_BOT_TOKEN;
export async function tg(method: string, body: Record<string, unknown>) {
  if (!process.env.TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  const res = await fetch(api() + "/" + method, {method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error("Telegram API error: " + JSON.stringify(data));
  return data.result;
}
export function fileIds(m: any): string[] {
  const ids: string[] = [];
  if (m.photo && m.photo.length) ids.push(m.photo[m.photo.length-1].file_id);
  for (const k of ["video","document","audio","voice","video_note","animation","sticker"]) if (m[k] && m[k].file_id) ids.push(m[k].file_id);
  return ids;
}
export function messageKind(m: any): string {
  if (m.photo) return "photo";
  for (const k of ["video","document","audio","voice","video_note","animation","sticker"]) if (m[k]) return k;
  if (m.text) return "text";
  return "other";
}
export async function menu(chatId: number, text: string) {
  return tg("sendMessage",{chat_id:chatId,text,reply_markup:{inline_keyboard:[[{text:"📁 Мои ячейки",callback_data:"cells"}],[{text:"➕ Создать ячейку",callback_data:"newcell"}],[{text:"ℹ️ Помощь",callback_data:"help"}]]}});
}
