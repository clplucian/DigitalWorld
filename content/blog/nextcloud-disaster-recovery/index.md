---
title: "Nextcloud Disaster Recovery"
date: 2019-08-15T12:18:01+03:00
draft: true
image: "/img/blog/nextcloud-mv-screenshot.png"
---
Synchronizing an app data directory, *containing thousands of files*, with Nextcloud: What happens in case of a partial and corrupted data set? How we helped our client getting their data back!
<!--more-->

{{< figure src="nextcloud-versions-dialog.png" title="Nextcloud Versions Dialog" class="float-right">}}

## The "disaster"

A Windows Server had accountancy software and its data files stored on shared volume. These are thousands of small files, modified on a regular base. The shared volume was synchronized with a Nextcloud server, using the client app. Two things happened, 7 days apart:

1. The Nextcloud server ran out of disk space, disabling any more uploads;
2. The Windows Server was hit by Ransomware, encrypting all files on it;

Probably it was for the best that the encrypted files didn't get uploaded. However, the last upload job of 1k+ files seemed to be stopped mid-flight due to the full disk. So there was an inconsistent data set on the Nextcloud server.

Now we had to restore all the files to a point that the application's data would be consistent. Nextcloud doesn't support a point-in-time recovery for a particular folder. Version management is per file only. Restoring previous versions through the web interface is only possible by going to every file's info dialog, select version and finally restore a listed version. Since we are talking about thousands of files here, this wasn't an option.

## Data structure

All files on the Nextcloud server are written somewhere on disk, following a specific hierarchy. It looks something like this:

````
/html/data/<user>
files
Transfer
             0007
....
     0066
     clona
     FreeTab
     salv_bd
                                                                                               files_external
09.02.2017.d1553114660
SAGA C.3.0
31.01.2017 ps.d1553110688
SAGA PS.3.0
keys
versions
SITUATIE LUNARA.d1558312066
   Lots of other stuff....
saga-backup
SAGA C.3.0
     0008
     0062
     clona
     salv_bd
SAGA PS.3.0
0001
0002
....
0020
Actualizari
clona
FreeTab
2756086713

10484 directories, 457016 files
````
The above output is seriously truncated and any company identifying information has been removed. But I've let the summary in the bottom intact, to appreciate the severity of the problem.

As you can see, the `files` and `files_versions` have the same directory structure. A current file in `files`:

````
files/saga-backup/SAGA C.3.0/0033/bonuri.dbf'
````

Is also present in `files_versions`, but with a suffixed version identifier:

````
files_versions/saga-backup/SAGA C.3.0/0033/bonuri.dbf.v1550591697
files_versions/saga-backup/SAGA C.3.0/0033/bonuri.dbf.v1555658257
files_versions/saga-backup/SAGA C.3.0/0033/bonuri.dbf.v1558524376
files_versions/saga-backup/SAGA C.3.0/0033/bonuri.dbf.v1558524388
files_versions/saga-backup/SAGA C.3.0/0033/bonuri.dbf.v1558524530
files_versions/saga-backup/SAGA C.3.0/0033/bonuri.dbf.v1558528152
files_versions/saga-backup/SAGA C.3.0/0033/bonuri.dbf.v1558531459
````

### Note on trashbin

The `files_trashbin` directory doesn't follow the `files` and `files_versions` structure. It is impossible to assert a trashed file's origin from the shell.  After running the steps explained in the next sections, we found some files were missing for correct execution of the accountancy app. Using the Nextcloud web interface, we were able to select all files trashed on the established day and restore them. Since this changed the files on the Nextcloud server, I had to re-run all the steps below. So you might want to start with restoring trashed files, first.

## The solution

The objective: extract a consistent data snapshot from the Nextcloud server, as close as possible to the present day. Also, we don't want to touch the original data-set, on which Nextcloud is still running. It won't appreciate its files being messed with, directly on the filesystem. Preferably we do it in a way that allows us to try different approaches, without additional data loss. So my weapons of choice are:

- A GNU bash shell;
- Rsync;
- BTRFS filesystem for snapshotting;
- GNU core utilities, like `find`, `mv`, `cp` etc;

### Step 1: Set up the local environment

I have an extra HDD in my laptop, used for this kind of cases. The complete Nextcloud data-set is 100GB. Since we are going to snapshot and duplicate data in different attempts, we are going to need some extra space. In my case I had more than 400GB available, so that's okay. The drive is already set-up with BTRFS.

First we create a subvolume for this case. Then rsync the data directory for the affected Nextcloud into this subvolume. Due to file ownership, I've temporarily allowed root login on the server. This pulls the files as root and writes them as the local user. This allows us to do most work as non-root user.

````
cd /mnt/hdd/ #Or wherever you mounted the btrfs volume
sudo btrfs subvol create recovery
sudo chown <you>:<you> -R recovery
cd recovery/
btrfs subvol create base
rsync -av cloud.usrpro.com:~/mnt/cloud/html/data/<user>/ base/
````

After rsync is done, we first create a new snapshot. So that `base` will remain untouched and something we can fall back to if we will need to try something else. The use of snapshots eliminates the need to copy everything again and again.

````
btrfs subvol snapshot base work
cd work/
````

### Step 2: Find a point in time

Now, we need to do some best guessing on the point of time where the data-set was consistent. So first, let us run this one-liner:

````
find files -type f -print0 | xargs -0 stat --format '%Y :%y %n' | sort -nr | cut -d: -f2- | head -n1
2019-08-03 13:59:54.000000000 +0300 files/saga-backup/SAGA C.3.0/0057/asigurari.cdx
````

The last file modified was on the 3rd of August. This seems consistent with what Nextcloud was saying in the web interface. Now, lets see if there are more files modified on the same day, hopefully in the same time frame. Here we will pipe into `less`, instead of `head` as we want to see the first and the last on that day.

````
find files -type f -newermt 2019-08-03 -print0 | xargs -0 stat --format '%Y :%y %n' | sort | cut -d: -f2- | less
2019-08-03 13:30:52.000000000 +0300 files/saga-backup/SAGA PS.3.0/0005/a3b.cdx
.... Many files ....
2019-08-03 13:59:54.000000000 +0300 files/saga-backup/SAGA C.3.0/0057/asigurari.cdx
lines 1151-1183/1183 (END)
````

So this seems a good prospect. On the 3rd of August, there was a single window of 30 minutes in which 1183 files where updated, until the server ran out of disk space.

### Step 3: Move old version files

We will move all the files edited on the 3rd of August from `files_version` into `files`. We will move, instead of copy, so that we can retain the option to restore more days in the past if needed. In the same operation we need to drop the `.v1558531459` suffixes. Thanks this [Stack Overflow answer](https://stackoverflow.com/a/4509530/1816774) I came up with the following solution:

````
cd files_versions
find -type f -newermt 2019-08-03 | while read f; do echo "${f}" "../files/${f%%.v1*}"; done | less
./saga-backup/SAGA PS.3.0/0005/bug_art.cdx.v1559761420 ../files/./saga-backup/SAGA PS.3.0/0005/bug_art.cdx
... and more
````

First we `cd` into `files_versions`, because we don't want that path prefixed to the `find` output. The `find` output is piped into a `while` loop, that exposes the current filename as variable `f`. Finally, we do a bash shell expansion, which cuts of anything beyond `.v1`. In the above example I'm using `echo` instead of `mv`, piped in to `less`. This gives us the opportunity to check the output for sanity.

Please note, that if you have any files that have `.v1` in their name its gonna cut of the name from that point on. So check the generated list carefully if there is no bogus output. Also, you file revision number might be in another range. Edit the globing pattern to meet you needs.

Double check if the resulting destinations resolves to real files:

````
ls ../files/./saga-backup/SAGA PS.3.0/0005/bug_art.cdx
````

If all seems okay, modify the command to use `mv`:

````
find -type f -newermt 2019-08-03 | while read f; do mv -v "${f}" "../files/${f%%.v1*}"; done
````

That's it! We've extracted and restored all Nextcloud data to a point in time. 

## Postmortem

Now that we recovered our precious files, it is important to note that these can't be simply pushed back to the Nextcloud server. In our case we concluded we don't want to use Nextcloud anymore for app data storage. After we validated that we got all the data we need, we deleted all data directories of the affected account and re-initialized the Nextcloud client to do a full upload of stuff we still want to back-up. Don't forget to empty the trash to reclaim lots of storage!

### BTRFS subvolumes

So what was the real use of the btrfs subvolumes? Well, this blog post summarizes the steps that finally worked to get a consistent and working data set. In fact I've fiddled with different approaches that didn't work. In total I ended up with 1 base snapshot and 7 snapshot of tries. Eventually only 1 worked. Also, there were numerous snapshots I dropped and re-created due to typo or similair errors, causing files to go into wrong places. In the end, btrfs + snapshots allowed me to:

- Create a virtual copy of all the files, without physically copying them (time and space saving)
- Easily revert to an earlier step in case something goes wrong

In my earlier attemps I was moving files to intermediate locations to do some investigation and to try different renaming options. Creating snapshots after each step that worked, helped a lot.