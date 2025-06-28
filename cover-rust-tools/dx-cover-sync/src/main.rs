use std::collections::{HashMap, HashSet};
use std::io::Cursor;
use std::path::PathBuf;

use anyhow::ensure;
use clap::Parser;
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tokio::fs::{File, read_to_string};
use tokio::io::copy;
use tokio::time::{Duration, sleep};

#[derive(Deserialize, Debug)]
struct SongEntry {
    artist: String,
    catcode: String,
    image_url: String,
    #[serde(default)]
    lev_mas: Option<String>,
    #[serde(default)]
    dx_lev_mas: Option<String>,
    title: String,
    title_kana: String,
}

#[derive(Deserialize, Serialize, Debug)]
struct OutputInfo {
    artist: String,
    title_kana: String,
}

#[derive(Parser, Debug)]
#[command(
    about = "Cover image and song info sync tool. Merge existing song info JSON and folder using data from official site or archived folder."
)]
struct Cli {
    #[arg(long, value_hint=clap::ValueHint::FilePath, help="Use offline archive folder with `maimai_songs.json` and cover JPEG files")]
    cover_archive: Option<PathBuf>,
    #[arg(
        long,
        action,
        help = "If true, it will use versions list file instead of internal lv file. It is useful to include removed songs."
    )]
    versions: bool,
    #[arg(value_hint = clap::ValueHint::FilePath, help="Internal lv or versions lookup file, used to filter songs to be included")]
    json_path: PathBuf,
    #[arg(value_hint = clap::ValueHint::FilePath, help="Path for the cover image files to be merged")]
    cover_path: PathBuf,
    #[arg(value_hint = clap::ValueHint::FilePath, help="Path for the output JSON file with artist and other info to be merged")]
    info_json_path: PathBuf,
}

fn catcode_to_category(catcode: &str) -> anyhow::Result<i32> {
    match catcode {
        "POPS＆アニメ" => Ok(1),
        "niconico＆ボーカロイド" => Ok(2),
        "東方Project" => Ok(3),
        "ゲーム＆バラエティ" => Ok(4),
        "maimai" => Ok(5),
        "オンゲキ＆CHUNITHM" => Ok(6),
        _ => Err(anyhow::anyhow!("Unknown catcode: {}", catcode)),
    }
}

fn song_title_fixes(from_json: &str) -> &str {
    match from_json {
        "Bad Apple!! feat.nomico" => "Bad Apple!! feat nomico",
        _ => from_json,
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();
    ensure!(cli.json_path.is_file(), "Input path should be a file");
    if cli.cover_archive.is_some() {
        ensure!(
            cli.cover_archive.as_ref().unwrap().is_dir(),
            "Cover archive path should be a dir"
        );
    }
    ensure!(cli.cover_path.is_dir(), "Cover path should be a dir");
    ensure!(
        cli.info_json_path.is_file(),
        "Info JSON path should be a file"
    );

    let json_contents = read_to_string(cli.json_path).await?;
    let mut variants = HashSet::<String>::new();
    if cli.versions {
        let versions_lookup: Vec<Vec<String>> = serde_json::from_str(&json_contents)?;
        // flatten versions_lookup and append into variants
        for version in versions_lookup {
            variants.extend(version);
        }
    } else {
        let internal_lv_lookup: HashMap<String, f64> = serde_json::from_str(&json_contents)?;
        for key in internal_lv_lookup.keys() {
            if key.len() > 2 {
                variants.insert(key[..key.len() - 2].to_string());
            }
        }
    }
    let mut info = serde_json::from_str::<IndexMap<String, OutputInfo>>(
        &read_to_string(&cli.info_json_path).await?,
    )?;

    // The certificate chain on the site is broken :(
    let client = reqwest::Client::builder()
        .danger_accept_invalid_certs(true)
        .build()?;
    let songs = match cli.cover_archive {
        Some(ref cover_archive) => {
            // Use the cover archive
            let archive_json = read_to_string(cover_archive.join("maimai_songs.json")).await?;
            serde_json::from_str::<Vec<SongEntry>>(&archive_json)?
        }
        None => {
            // Fetch from the official site
            client
                .get("https://maimai.sega.jp/data/maimai_songs.json")
                .send()
                .await?
                .json::<Vec<SongEntry>>()
                .await?
        }
    };

    for song in songs.iter() {
        let title = song_title_fixes(&song.title);
        if song.catcode == "宴会場" {
            continue;
        }
        let category = catcode_to_category(song.catcode.as_str())?;
        let mut matched: bool = false;
        if song.lev_mas.is_some() {
            let variant_key = format!("{category}_{title}_f");
            if variants.contains(&variant_key) {
                variants.remove(&variant_key);
                matched = true;
            }
        }
        if song.dx_lev_mas.is_some() {
            let variant_key = format!("{category}_{title}_t");
            if variants.contains(&variant_key) {
                variants.remove(&variant_key);
                matched = true;
            }
        }
        if !matched {
            // If song is not matched, skip it
            println!("Skipping {title} ({category})");
            continue;
        }
        // Make a sha256 with format!("{category}_{title}")
        let info_key = format!("{category}_{title}");
        if let Some(output_info) = info.get_mut(&info_key) {
            output_info.artist = song.artist.clone();
            output_info.title_kana = song.title_kana.clone();
        } else {
            info.insert(
                info_key,
                OutputInfo {
                    artist: song.artist.clone(),
                    title_kana: song.title_kana.clone(),
                },
            );
        }

        let to_be_hash = format!("{category}_{title}");
        let hash = Sha256::digest(to_be_hash.as_bytes());
        let hash_hex = base16ct::lower::encode_string(&hash);
        let target_filename = format!("{}.png", &hash_hex[..8]);
        let target_path = cli.cover_path.join(target_filename);

        if !target_path.exists() {
            let source_filename = &song.image_url;
            match cli.cover_archive {
                Some(ref cover_archive) => {
                    // Use the cover archive
                    let source_path = cover_archive.join(source_filename);
                    if !source_path.exists() {
                        println!("Source file {source_path:?} does not exist, skipping {title}");
                        continue;
                    }
                    println!("Copying {title} from {source_path:?} to {target_path:?}");
                    tokio::fs::copy(source_path, &target_path).await?;
                }
                None => {
                    println!("Downloading {title} ({source_filename})...");
                    let url =
                        format!("https://maimaidx.jp/maimai-mobile/img/Music/{source_filename}");
                    let resp = client.get(url).send().await?.error_for_status()?;
                    let mut file = File::create(target_path).await?;
                    let mut content = Cursor::new(resp.bytes().await?);
                    copy(&mut content, &mut file).await?;
                    sleep(Duration::from_millis(125)).await;
                }
            }
        } else {
            println!("File {target_path:?} already exists, skipping {title}");
        }

        // Write back updated info JSON
        let info_json = serde_json::to_string_pretty(&info)?;
        tokio::fs::write(&cli.info_json_path, info_json).await?;
    }
    println!("Done. Variants left not found in the source:");
    for variant in variants {
        println!("{variant}");
    }
    Ok(())
}
