# Telegram Material Collector

Начальная версия Telegram-бота для Vercel + Neon PostgreSQL.

## Функции этой версии
- Команды /start, /menu, /help, /cells, /cancel
- Создание ячеек
- Выбор ячейки-приёмника
- Сохранение текста и Telegram file_id фото, видео, документов, аудио, голосовых, стикеров
- Просмотр последних 30 материалов в ячейке
- Белый список через ALLOWED_TELEGRAM_IDS

## Установка
1. Создайте Neon PostgreSQL и выполните sql/schema.sql в Neon SQL Editor.
2. Импортируйте репозиторий в Vercel.
3. Добавьте TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, DATABASE_URL, APP_URL и при необходимости ALLOWED_TELEGRAM_IDS.
4. Deploy.
5. Установите webhook через браузер: https://api.telegram.org/bot<TOKEN>/setWebhook?url=<APP_URL>/api/telegram&secret_token=<SECRET>

Важно: это первая версия. Объединение альбомов/пачек, переименование ячеек, удаление материалов и расширенная очистка сообщений — следующие этапы. Материалы пока сохраняются как метаданные и file_id в Telegram, файлы не копируются на Vercel. Не добавляйте .env в GitHub и никому не отправляйте токен.
