-- Add Telegram chat ID to profiles for push notifications
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_chat_id text DEFAULT NULL;
