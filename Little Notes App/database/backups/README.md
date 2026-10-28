# Database Backup and Recovery

## Export a backup

Before export, confirm XAMPP MySQL is running and the `sticky_notes` database is selected.

### phpMyAdmin (recommended for this class project)
1. Open phpMyAdmin and select `sticky_notes`.
2. Choose **Export**, select **Custom**, and keep all tables selected.
3. Use SQL format; include structure and data. Keep the export as a `.sql` file.
4. Save it outside the project folder or in a protected local backup folder. Do not commit dumps because they may contain note content.
5. Record the export date and verify the file exists and has a plausible nonzero size.

For a command-line export, XAMPP includes `E:\XAMPP\mysql\bin\mysqldump.exe`. Run it from PowerShell, enter the requested database password at the prompt, and save the output to a dated `.sql` path:

```powershell
& 'E:\XAMPP\mysql\bin\mysqldump.exe' --host=127.0.0.1 --port=3306 --user=root --password --single-transaction --triggers sticky_notes --result-file='E:\secure-backups\sticky-notes-YYYYMMDD-HHmm.sql'
```

If the XAMPP administrator account has no password, omit `--password`. Do not put a real password in the command, script, screenshot, or project files.

## Verify and restore safely

1. Preserve the original dump unchanged and make a second working copy.
2. In phpMyAdmin, create a temporary database such as `sticky_notes_restore_test`.
3. Select that temporary database and use **Import** to load the `.sql` dump. If the dump was made without a database name, choose the destination database before importing.
4. Confirm `categories` and `notes` exist and compare table row counts with the expected backup. Open representative records carefully; note bodies may contain private information.
5. Remove the temporary restore-test database only after confirming the original `sticky_notes` database remains intact.

For an actual recovery, stop the app, preserve a copy of the current database first, and import the verified dump into the intended database using phpMyAdmin. Confirm the restored tables and rows before restarting the app. Recovery replaces the current data, so never use an unverified dump as the only copy.

## Backup handling

- Keep at least one dated copy outside the project folder.
- Do not add database dumps or credentials to Git.
- A successful export alone does not prove recoverability; periodically test an import into a separate database.
