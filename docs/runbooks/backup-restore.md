# Backup and restore runbook

> **Target procedure for M6/M7; not implemented during M0.** No backup, restore, application runtime or smoke-test implementation exists in the current repository. The responsible milestone issues must turn this contract into executable, tested operations before it can be used as recovery evidence.

## Backup contract

A complete backup must contain one consistent recovery set with:

- a PostgreSQL dump;
- the persistent uploads volume;
- a manifest plus its detached checksum.

The checksummed manifest must contain:

- the exact application version and database schema version;
- checksums for the PostgreSQL dump and uploads-volume archive;
- the agreed per-table row counts and total upload count;
- one known Sitzplan ID;
- that Sitzplan's expected Klasse ID, Raumvorlage ID, complete Zuordnungen and Uploadreferenzen.

Assign the set a unique backup identifier and record its creation time, source environment, component checksums and retention status. Store backup material and its credentials outside git. Never use real student data while the project remains within the prototype/test-data boundary.

## Target backup procedure

1. Confirm the running application and schema versions and record them in the manifest with the backup identifier.
2. Create the PostgreSQL dump using the format selected and tested by the M7 implementation issue.
3. Capture the uploads volume at a consistency point compatible with the database dump.
4. Record the agreed per-table row counts, total upload count, known Sitzplan ID and its expected Klasse, Raumvorlage, Zuordnungen and Uploadreferenzen in the manifest.
5. Calculate the dump and uploads checksums, complete the manifest, then calculate and store its detached checksum.
6. Verify the dump, uploads archive, manifest and detached manifest checksum are present and readable before marking the recovery set complete.

## Target restore procedure

1. Provision an empty, disposable restore target. Never restore over the active source or a non-empty database or uploads volume.
2. Verify the detached manifest checksum and every component checksum from that manifest. Confirm its recorded application and schema versions are supported by the restore tooling.
3. Restore the PostgreSQL dump and uploads volume as one recovery set.
4. Start the recorded compatible application version and run schema/version validation without silently changing the backup source.
5. Compare every restored table count and the restored upload count exactly with the values in the recovery-set manifest. Any difference fails the restore.
6. Open the known Sitzplan ID from the recovery-set manifest and compare its Klasse, Raumvorlage, complete Zuordnungen and Uploadreferenzen exactly with the manifest. Any difference fails the restore.
7. Exercise the implemented restore smoke checks and record commands, results, timestamps and the disposable target identifier.
8. Destroy or sanitize the disposable target according to the implemented retention procedure after evidence has been retained.

A successful restore must prove component integrity, expected counts and the ability to open the known plan. Process exit alone is not sufficient.
