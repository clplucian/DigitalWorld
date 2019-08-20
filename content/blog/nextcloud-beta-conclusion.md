---
title: "Nextcloud Beta Conclusion"
date: 2019-08-19T12:10:29+03:00
draft: true
image: "/img/blog/nextcloud-logo-background.png"
---
Nextcloud seems to become more and more popular for backup management, around the world. Since years they've provided the community with an open source cloud storage server and client applications that work on Windows, Mac, Linux, iOS and Android. Not many vendors, including proprietary ones, can say to deliver such a consistent product.
<!--more-->

At Mohlmann Solutions, want to help our clients to use this wonderful product. Before offering anything, we consider that some serious testing needs to be done. Hence, we offered our Nextcloud services to a select group of clients for free. In return they would give us valuable feedback about usage issues and limitations. And surely we found that limit!

## The (fatal) test case

An accountancy company with 4 persons. Using an accountancy software suite in parallel. The actual software and account databases were stored on a Windows Network volume, on a server. The server was running the Nextcloud Client on that volume, to provide real-time back-ups the the Nextcloud server.

The data structure of said software consisted of thousands of small files. Many of those files would be written to, when a user was saving data. Even worse during software updates, where all files where moved between directories and back again as part of some sort of migration. While the Nextcloud client was desperately working to keep track of all this. Most files would disappear before the queue was even close from being processed.

We were impressed during this 6+ months trial. Apart from an occasional conflict or one or two times that the client crashed, everything seemed to work fine. The server, running in a Docker container, didn't need any attention during this time.

### When disaster struck

Separated by 7 days, two things happened. First, the Nextcloud server data disk ran out of disk space. Not necessarily a disaster: We separated the data disk from the operating system and databases. Nextcloud continued functioning as a read-only service. Although no data could be uploaded anymore.

Way more seriously though, the accountant's application server got infected by **Ransomware**, the kind that encrypts all your files. In some ways we were lucky that the Nextcloud server was full. None of the encrypted files got uploaded.

### Restoring old file versions

As said, the accountancy software overwrites many files during some operations. Resulting in big queued sets. And off course, the disk was full somewhere at mid-flight. So with a portion of the app's database files at version X and some on version Y, resulting in a inconsistent data set on the Nextcloud server. The accountant was doing monthly archiving of all their client's data, into zip files. And off course, the last archive was one month old.

In theory this should not be a problem. Nextcloud keeps an old version of each file! Great, but literally this applies to **files** only. If we wanted to revert any files to a past version, we would have to do this one-by-one from the web interface. There is no functionality that reverts all files of a directory up to a certain date. And we are talking thousands of files here... So they might as well redo the whole month and it would be quicker!

The real solution proved to be a challenge. And for those interested, there is [another blog post]({{< ref "nextcloud-disaster-recovery" >}}) on the technical details how we pulled that off.

## The other test cases

We had more installations of Nextcloud running. All of them worked fine and without havoc. We've extensively used its file sharing options, internally and also to external instances. Furthermore, Nextcloud kept our data in sync between devices without effort.

## Conclusion

Nextcloud is a very mature and stable product. It is cut out for storing, sharing and synchronizing large amounts of documents on multiple devices.

However, real time back-ups of thousands of application data files can result in inconstancy. Time based incremental backups seem to more suitable for this use case.
