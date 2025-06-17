use std::io::Cursor;
use std::path::PathBuf;

use anyhow::ensure;
use clap::Parser;
use serde::Deserialize;
use tokio::fs::{read_to_string, File};
use tokio::io::copy;
use tokio::time::{sleep, Duration};

#[derive(Deserialize, Debug)]
struct SongEntry {
    title: String,
    image_url: String,
}

#[derive(Parser, Debug)]
struct Cli {
    #[arg(value_hint = clap::ValueHint::DirPath)]
    path: PathBuf,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();
    ensure!(cli.path.is_dir(), "Input path should be a dir");
    let json_contents = read_to_string(cli.path.join("maimai_songs.json")).await?;
    let songs: Vec<SongEntry> = serde_json::from_str(&json_contents)?;
    // The certificate chain on the site is broken :(
    let client = reqwest::Client::builder().danger_accept_invalid_certs(true).build()?;
    for song in songs.iter() {
        let title = &song.title;
        let filename = &song.image_url;
        let image_path = cli.path.join(filename);
        if image_path.exists() {
            println!("{title} ({filename}) file exists, skipped");
            continue;
        }
        println!("Downloading {title} ({filename})...");
        let url = format!("https://maimaidx.jp/maimai-mobile/img/Music/{filename}");
        let resp = client.get(url).send().await?.error_for_status()?;
        let mut file = File::create(image_path).await?;
        let mut content = Cursor::new(resp.bytes().await?);
        copy(&mut content, &mut file).await?;
        sleep(Duration::from_secs(1)).await;
    }
    Ok(())
}
