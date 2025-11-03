# otohime-data-tools

Data aggregation and processing tools for the Otohime site.

## Overview

This repository contains tools for processing maimai DX data, including:
- Sync Internal level data form the DXNET of Japanese version of DXNET
- Cover image synchronization from official JSON sources

## Components

### [rating-merge](rating-merge/)

TypeScript tools for preparing and updating internal level JSON files for maimai DX.

It will try to auto-fill internal levels using Japanese DX-NET data, and merge the data
with song list in international version, to provide a clear and usable internal level JSON
file to the current international verion release.

See [rating-merge/README.md](rating-merge/README.md) for detailed usage.

### [cover-rust-tools](cover-rust-tools/)

Rust-based tools for synchronizing cover images and song metadata.


It will download cover images from official maimai DX source, and merge existing song data with new information.

- Support for both online fetching and offline archive processing
- Cover name will be aligned with song ID in Otohime backend

See [cover-rust-tools/README.md](cover-rust-tools/README.md) for detailed usage.

## Assets

The `assets/` directory is shared between the project, to preseve the current status of the assets. Both tools aboved will try to update folder with the updates.

It will contains:
- `covers/`: PNG cover images for songs
  - This can be updated with `cover-rust-tools`.
  - For the production version of Otohime, it also contains covers for removed songs obtained from various source like RemyWiki and Wayback Machine.
  - The covers alternated in international version (like `crazy (about you)`、`8-EM` and `シカ色デイズ`) will be manually synced.
- `covers-webp/`: WebP format cover images
  - It is converted using `webp.sh` (requires ImageMagick), and will be synced to CloudFlare R2 running on https://covers.otohi.me/ via `rclone`.
- `cover-archives/`: Archived cover image data from different versions
  - Some covers from removed songs are obtained in this way.
- `dxnet/`: HTML files from DX-NET for parsing
- `internal_lvs/`: Internal level JSON files and metadata
  - The result files will be used in server code, stored at `hooks/src`.

Distributing most of the assets in these direcories may be a copyright violation, so only resulting JSON files will be commited into the repository.

## Prerequisites

- **For rating-merge**: Node.js 18+ and npm
- **For cover-rust-tools**: Rust 1.70+ (2024 edition)

## Quick Start

### Rating Merge

```bash
cd rating-merge
npm install
npm run tsx auto-fill.ts
```

### Cover Sync

```bash
cd cover-rust-tools
cargo build --release
cargo run --release --bin dx-cover-sync -- [OPTIONS] <JSON_PATH> <COVER_PATH> <INFO_JSON_PATH>
```

## License

MIT License. 

See [LICENSE](LICENSE) for details.
