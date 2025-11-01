# cover-rust-tools

Rust-based tools for synchronizing maimai DX cover images and song metadata.

This workspace contains tools to download and manage cover images from official maimai DX sources, merge them with existing song data, and maintain consistency using SHA256-based file naming, same as the song ID convention of Otohime.

## Tools

### dx-cover-sync

Cover image and song info synchronization tool that merges existing song info JSON and cover image folders using data from the official maimai DX website or archived folders.

#### Features

- **Online Mode**: Fetches cover images directly from `https://maimaidx.jp/maimai-mobile/img/Music/`
- **Offline Mode**: Uses local archive folder with pre-downloaded images
- **Smart Filtering**: Only processes songs present in internal level or version lists
- **Metadata Sync**: Updates artist names and title kana (reading) information
- **SHA256 Naming**: Generates consistent filenames based on `{category}_{title}` hash
- **Incremental Updates**: Skips already downloaded images
- **Rate Limiting**: Built-in delays between downloads (125ms) to be respectful to servers

#### Usage

```bash
cargo run --release --bin dx-cover-sync -- [OPTIONS] <JSON_PATH> <COVER_PATH> <INFO_JSON_PATH>
```

##### Arguments

- `<JSON_PATH>`: Internal level or versions lookup file, used to filter songs to be included
  - For internal levels: JSON object with `"4_PUPA_t_3": 14.4` format
  - For versions: JSON array of string arrays (use with `--versions` flag)

- `<COVER_PATH>`: Directory path where cover image files will be saved/merged
  - Must be an existing directory
  - Images are saved as `{hash}.png` where hash is first 8 chars of SHA256(`{category}_{title}`)
    - This is the song ID format used in Otohime backend.
    - It must contain category, as there is already two song named `Link`.
    - Songs from the "宴会場" (Party), where the same song with different node designer will exist is not handled yet.

- `<INFO_JSON_PATH>`: Path to the output JSON file containing artist and other metadata
  - Must be an existing file
  - Will be updated with new song information as images are processed

##### Options

- `--cover-archive <PATH>`: Use offline archive folder containing `maimai_songs.json` and cover JPEG files
  - If not specified, tool will fetch data from official website
  - Archive folder must contain `maimai_songs.json` and image files

- `--versions`: Use versions list file instead of internal level file
  - Useful for including removed songs from previous versions
  - Changes how `<JSON_PATH>` is interpreted

#### Examples

##### Online Mode - Download from Official Site

```bash
# Using internal levels file
cargo run --release --bin dx-cover-sync -- \
  ../assets/internal_lvs/25_circle.json \
  ../assets/covers \
  ../assets/covers/info.json

# Using versions file
cargo run --release --bin dx-cover-sync -- --versions \
  ../assets/internal_lvs/versions.json \
  ../assets/covers \
  ../assets/covers/info.json
```

##### Offline Mode - Use Local Archive

```bash
cargo run --release --bin dx-cover-sync -- \
  --cover-archive ../assets/cover-archives/prism-covers \
  ../assets/internal_lvs/25_circle.json \
  ../assets/covers \
  ../assets/covers/info.json
```

#### Output Format

**Cover Images**: Saved as PNG files with names based on SHA256 hash:
```
{first_8_chars_of_sha256(category_title)}.png
```

**Info JSON**: Contains artist and title kana for each song, extrated from `maimai_songs.json` in the official site:
```json
{
  "1_ECHO": {
    "artist": "Crusher-P",
    "title_kana": "えこー"
  },
  "5_Link": {
    "artist": "Glaciaxion feat. Lanota",
    "title_kana": "りんく"
  }
}
```

The key format is `{category}_{title}`.

#### Data Sources

- **Official Site**: `https://maimai.sega.jp/data/maimai_songs.json` (metadata)
- **Cover Images**: `https://maimaidx.jp/maimai-mobile/img/Music/{filename}.png`

Note: The tool accepts invalid certificates for the official site due to known certificate chain issues.

## Building

```bash
# Build all tools
cargo build --release

# Build specific tool
cargo build --release --bin dx-cover-sync
```

## Requirements

- Rust 1.70 or later (2024 edition)
- Internet connection (for online mode)

## Dependencies

- `clap`: Command-line argument parsing
- `reqwest`: HTTP client for downloading
- `tokio`: Async runtime
- `serde` / `serde_json`: JSON serialization
- `sha2`: SHA256 hashing
- `base16ct`: Hex encoding
- `anyhow`: Error handling
- `indexmap`: Ordered map for preserving JSON key order

## License

See [../LICENSE](../LICENSE) for details.
