-- fix074: marca gli account platform-admin come is_super_admin = true
-- questi account non devono mai apparire nella gestione account di nessun club

UPDATE utenti
SET is_super_admin = true
WHERE email IN (
  'dimuropaolo7@gmail.com',
  'dimuroasia45@gmail.com',
  'dimuroasia7@gmail.com',
  'dimuropaolo@gmail.com',
  'dimuropaolo77@gmail.com'
);
