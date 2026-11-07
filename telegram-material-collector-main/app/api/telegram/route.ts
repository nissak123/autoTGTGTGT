import {sql,ensureUser} from "@/lib/db";
import {tg,menu,fileIds,messageKind} from "@/lib/telegram";
export const runtime="nodejs";
function allowed(id:number){const s=process.env.ALLOWED_TELEGRAM_IDS?.trim();return !s||s.split(",").map(x=>x.trim()).includes(String(id));}
async function cells(chatId:number,userId:number){
 const rows=await sql`SELECT c.id,c.name,c.is_inbox,COUNT(m.id)::int AS total FROM cells c LEFT JOIN materials m ON m.cell_id=c.id AND m.deleted_at IS NULL WHERE c.telegram_user_id=${userId} GROUP BY c.id ORDER BY c.is_inbox DESC,c.created_at ASC`;
 const u=await sql`SELECT receiver_cell_id FROM users WHERE telegram_id=${userId}`;const receiver=u[0]?.receiver_cell_id;
 const keyboard:any[]=rows.map((c:any)=>[{text:"📂 "+c.name+" ("+c.total+")",callback_data:"open:"+c.id},{text:Number(receiver)===Number(c.id)?"✅ Приёмник":"➡️ Принимать сюда",callback_data:"receiver:"+c.id}]);
 keyboard.push([{text:"➕ Новая ячейка",callback_data:"newcell"}]);if(receiver)keyboard.push([{text:"⏹ Выключить приёмник",callback_data:"receiver:off"}]);
 await tg("sendMessage",{chat_id:chatId,text:"Ваши ячейки. Выберите ячейку для просмотра или назначьте приёмник:",reply_markup:{inline_keyboard:keyboard}});
}
async function openCell(chatId:number,userId:number,id:number){
 const c=await sql`SELECT id,name FROM cells WHERE id=${id} AND telegram_user_id=${userId}`;if(!c.length)return;
 const rows=await sql`SELECT id,kind,text_content FROM materials WHERE telegram_user_id=${userId} AND cell_id=${id} AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 30`;
 const body=rows.length?rows.map((r:any)=>"#"+r.id+" · "+r.kind+" · "+String(r.text_content||"").slice(0,80)).join("\n"):"Пока пусто.";
 await tg("sendMessage",{chat_id:chatId,text:"📁 "+c[0].name+"\nМатериалов: "+rows.length+"\n\n"+body,reply_markup:{inline_keyboard:[[{text:"⬅️ К ячейкам",callback_data:"cells"}]]}});
}
export async function POST(req:Request){
 const secret=req.headers.get("x-telegram-bot-api-secret-token");if(!process.env.TELEGRAM_WEBHOOK_SECRET||secret!==process.env.TELEGRAM_WEBHOOK_SECRET)return new Response("Unauthorized",{status:401});
 const update=await req.json();
 try{
  if(update.callback_query){const q=update.callback_query;const uid=Number(q.from.id),chat=Number(q.message.chat.id);if(!allowed(uid)){await tg("answerCallbackQuery",{callback_query_id:q.id,text:"Доступ запрещён"});return Response.json({ok:true});}await ensureUser(uid);await tg("answerCallbackQuery",{callback_query_id:q.id});const d=String(q.data||"");
   if(d==="cells")await cells(chat,uid);
   else if(d==="newcell"){await sql`UPDATE users SET state='new_cell' WHERE telegram_id=${uid}`;await tg("sendMessage",{chat_id:chat,text:"Отправьте название новой ячейки (до 60 символов). Для отмены — /cancel."});}
   else if(d==="help")await menu(chat,"Перешлите боту текст или файл. Создайте ячейку и назначьте её приёмником.");
   else if(d.startsWith("receiver:")){const v=d.slice(9);if(v==="off")await sql`UPDATE users SET receiver_cell_id=NULL WHERE telegram_id=${uid}`;else{const id=Number(v);await sql`UPDATE users SET receiver_cell_id=${id} WHERE telegram_id=${uid} AND EXISTS(SELECT 1 FROM cells WHERE id=${id} AND telegram_user_id=${uid})`;}await cells(chat,uid);}
   else if(d.startsWith("open:"))await openCell(chat,uid,Number(d.slice(5)));
   return Response.json({ok:true});
  }
  const m=update.message||update.edited_message;if(!m?.chat?.id||!m?.from?.id)return Response.json({ok:true});const uid=Number(m.from.id),chat=Number(m.chat.id);if(!allowed(uid)){await tg("sendMessage",{chat_id:chat,text:"⛔ Нет доступа. Ваш Telegram ID: "+uid});return Response.json({ok:true});}await ensureUser(uid);
  const u=(await sql`SELECT state,receiver_cell_id FROM users WHERE telegram_id=${uid}`)[0];const text=String(m.text||"");
  if(text.startsWith("/start")||text.startsWith("/menu")){await sql`UPDATE users SET state=NULL WHERE telegram_id=${uid}`;await menu(chat,"👋 Это ваш каталог материалов. Создайте ячейку или перешлите сюда материал.");return Response.json({ok:true});}
  if(text.startsWith("/cells")){await cells(chat,uid);return Response.json({ok:true});}
  if(text.startsWith("/cancel")){await sql`UPDATE users SET state=NULL WHERE telegram_id=${uid}`;await menu(chat,"Действие отменено.");return Response.json({ok:true});}
  if(text.startsWith("/help")){await menu(chat,"Команды: /start, /cells, /cancel, /help. Поддерживаются текст, фото, видео, документы, аудио, голосовые и стикеры.");return Response.json({ok:true});}
  if(u?.state==="new_cell"){const name=text.trim();if(!name||name.length>60){await tg("sendMessage",{chat_id:chat,text:"Название должно быть от 1 до 60 символов."});return Response.json({ok:true});}const r=await sql`INSERT INTO cells(telegram_user_id,name) VALUES(${uid},${name}) RETURNING id`;await sql`UPDATE users SET state=NULL,receiver_cell_id=${r[0].id} WHERE telegram_id=${uid}`;await menu(chat,"✅ Ячейка «"+name+"» создана и назначена приёмником.");return Response.json({ok:true});}
  const fallback=await sql`SELECT id FROM cells WHERE telegram_user_id=${uid} AND is_inbox=TRUE LIMIT 1`;const cellId=u?.receiver_cell_id||fallback[0]?.id;const kind=messageKind(m);
  await sql`INSERT INTO materials(telegram_user_id,cell_id,source_chat_id,source_message_id,media_group_id,kind,text_content,file_ids,raw_message) VALUES(${uid},${cellId},${chat},${m.message_id},${m.media_group_id||null},${kind},${m.text||m.caption||""},${JSON.stringify(fileIds(m))}::jsonb,${JSON.stringify(m)}::jsonb)`;
  await tg("sendMessage",{chat_id:chat,text:"✅ Материал сохранён · "+kind+(u?.receiver_cell_id?"":" · Без ячейки")});return Response.json({ok:true});
 }catch(e){console.error("Webhook error",e);return Response.json({ok:true});}
}
