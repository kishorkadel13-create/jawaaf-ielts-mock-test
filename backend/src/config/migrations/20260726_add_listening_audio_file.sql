ALTER TABLE mock_tests
ADD COLUMN IF NOT EXISTS audio_file TEXT;

COMMENT ON COLUMN mock_tests.audio_file IS
  'Listening audio storage path, e.g. audio/<test-id>/cam18-test1.mp3. Audio bytes are stored in object storage, never in the database.';
