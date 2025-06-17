### Rating Merge Tools

This is a tool to prepare the updated internal level JSON file using the resources previously available.

This tool may be reworked soon, see the TODO section.

#### Usage

* `parse.ts`: Generate a CSV work table for new version, providing:
  - Internal level JSON file from previous release
  - Song list for EXPERT, MASTER, and RE:MASTER difficulty
  - Song list for latest version

  It will detect whether the level is changed, if so, it will removed the filled internal lv.
* `finalized.ts`: Convert the finished work table into the internal level JSON file.

#### TODO

* Automatically guess internal lv after Japanese version of DXNET changes