# TELJES ADATBÁZIS EXPORT - EGYETLEN PARANCS

## A teljes DingleUP! adatbázis letöltése egyetlen paranccsal

Futtasd ezt a parancsot a terminálban:

```bash
PGPASSWORD='wdpxmwsxhckazwxufttk_db_password_ide' pg_dump \
  -h aws-0-eu-central-1.pooler.supabase.com \
  -p 6543 \
  -U postgres.wdpxmwsxhckazwxufttk \
  -d postgres \
  --schema=public \
  --data-only \
  --inserts \
  --no-owner \
  --no-acl \
  --column-inserts \
  -f db/FULL_DATA_2025-12-01.sql
```

**FONTOS:** A jelszót (`wdpxmwsxhckazwxufttk_db_password_ide`) cseréld le az actual Supabase database jelszavadra.

## Jelszó megszerzése

1. Menj a Supabase Dashboard-ra: https://supabase.com/dashboard/project/wdpxmwsxhckazwxufttk/settings/database
2. "Database Password" résznél látod a jelszót (vagy reset-elheted ha nem emlékszel rá)

## Mi lesz az eredmény?

A `db/FULL_DATA_2025-12-01.sql` fájl tartalmazni fogja:
- ✅ Minden felhasználó (profiles)
- ✅ Minden admin jogosultság (user_roles)  
- ✅ Mind a 4500 kérdés (questions)
- ✅ Mind a 4167 fordítás (translations)
- ✅ Mind a 15 question pool
- ✅ Minden wallet tranzakció (2639 db)
- ✅ Minden game result (203 db)
- ✅ Minden daily ranking
- ✅ Minden lootbox instance
- ✅ Minden egyéb adat

Az exportált fájl **INSERT statementekkel** tartalmazza az adatokat, tehát közvetlenül importálható lesz.

## Import (később)

```bash
psql -U postgres -d dingleup -f db/FULL_DATA_2025-12-01.sql
```

---

**Alternatíva - Ha nincs telepítve pg_dump:**

Telepítsd a PostgreSQL client-et:

```bash
# Ubuntu/Debian
sudo apt-get install postgresql-client

# MacOS
brew install postgresql

# Windows
# Töltsd le: https://www.postgresql.org/download/windows/
```

Utána futtasd a fenti export parancsot.
